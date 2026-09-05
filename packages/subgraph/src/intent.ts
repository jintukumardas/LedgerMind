import { Address, BigInt, Bytes, store } from "@graphprotocol/graph-ts";
import {
  Executed,
  MerchantUpdated,
  Revoked,
  ToppedUp,
  Withdrawn,
} from "../generated/templates/PaymentIntent/PaymentIntent";
import {
  IntentDailySnapshot,
  MerchantUpdate,
  Payment,
  PaymentIntent,
  Revocation,
  TopUp,
  Withdrawal,
} from "../generated/schema";
import {
  ZERO,
  dayStart,
  eventId,
  loadAgent,
  loadMerchant,
  loadPayer,
  loadProtocol,
} from "./shared";

const BPS = BigInt.fromI32(10000);

function intentIdOf(addr: Address): Bytes {
  return Bytes.fromHexString(addr.toHexString());
}

/**
 * Daily rollup per intent. uniqueMerchantCount is tracked with a per-day
 * merchant list held on the snapshot id namespace; we approximate by
 * counting first-payment-of-day per merchant via the Merchant entity's
 * lastPaidAt, which is exact for our access pattern.
 */
function updateSnapshot(
  intent: PaymentIntent,
  timestamp: BigInt,
  spentDelta: BigInt,
  toppedUpDelta: BigInt,
  isNewMerchantToday: boolean,
  paymentAmount: BigInt
): void {
  let day = dayStart(timestamp);
  let id = intent.id.concat(Bytes.fromUTF8("-")).concat(
    Bytes.fromUTF8(day.toString())
  );

  let snap = IntentDailySnapshot.load(id);
  if (snap == null) {
    snap = new IntentDailySnapshot(id);
    snap.intent = intent.id;
    snap.dayStartTimestamp = day;
    snap.paymentCount = 0;
    snap.amountSpent = ZERO;
    snap.amountToppedUp = ZERO;
    snap.cumulativeSpent = ZERO;
    snap.uniqueMerchantCount = 0;
    snap.largestPayment = ZERO;
  }

  if (spentDelta.gt(ZERO)) {
    snap.paymentCount = snap.paymentCount + 1;
    snap.amountSpent = snap.amountSpent.plus(spentDelta);
    if (paymentAmount.gt(snap.largestPayment)) {
      snap.largestPayment = paymentAmount;
    }
    if (isNewMerchantToday) {
      snap.uniqueMerchantCount = snap.uniqueMerchantCount + 1;
    }
  }
  if (toppedUpDelta.gt(ZERO)) {
    snap.amountToppedUp = snap.amountToppedUp.plus(toppedUpDelta);
  }

  snap.cumulativeSpent = intent.spent;
  snap.save();
}

export function handleExecuted(event: Executed): void {
  let intent = PaymentIntent.load(intentIdOf(event.address));
  if (intent == null) return;

  let timestamp = event.block.timestamp;
  let amount = event.params.amount;

  let merchant = loadMerchant(event.params.merchant, timestamp);
  // loadMerchant initialises lastPaidAt to the current timestamp, so a
  // first-time merchant would fail a bare `lastPaidAt < dayStart` test and
  // never be counted. Treat "never paid before" as new-today explicitly.
  let isFirstEver = merchant.paymentCount == 0;
  let isNewMerchantToday =
    isFirstEver || merchant.lastPaidAt.lt(dayStart(timestamp));

  let agent = loadAgent(event.params.agent, timestamp);
  let payer = loadPayer(Address.fromBytes(intent.payer), timestamp);

  intent.spent = intent.spent.plus(amount);
  intent.remainingCap = intent.totalCap.gt(intent.spent)
    ? intent.totalCap.minus(intent.spent)
    : ZERO;
  intent.paymentCount = intent.paymentCount + 1;
  intent.lastActivityAt = timestamp;
  intent.save();

  let payment = new Payment(eventId(event));
  payment.intent = intent.id;
  payment.agent = agent.id;
  payment.merchant = merchant.id;
  payment.payer = payer.id;
  payment.token = Bytes.fromHexString(event.params.token.toHexString());
  payment.amount = amount;
  payment.receiptHash = event.params.receiptHash;
  payment.receiptURI = event.params.receiptURI;
  payment.spentAfter = intent.spent;
  payment.capUtilizationBps = intent.perTxCap.gt(ZERO)
    ? amount.times(BPS).div(intent.perTxCap)
    : ZERO;
  payment.timestamp = timestamp;
  payment.blockNumber = event.block.number;
  payment.txHash = event.transaction.hash;
  payment.logIndex = event.logIndex;
  payment.save();

  merchant.totalReceived = merchant.totalReceived.plus(amount);
  merchant.paymentCount = merchant.paymentCount + 1;
  merchant.lastPaidAt = timestamp;
  if (isFirstEver) merchant.firstPaidAt = timestamp;
  merchant.save();

  agent.totalSpent = agent.totalSpent.plus(amount);
  agent.paymentCount = agent.paymentCount + 1;
  agent.lastActiveAt = timestamp;
  agent.save();

  payer.totalSpent = payer.totalSpent.plus(amount);
  payer.lastActiveAt = timestamp;
  payer.save();

  let protocol = loadProtocol();
  protocol.paymentCount = protocol.paymentCount + 1;
  protocol.totalVolume = protocol.totalVolume.plus(amount);
  protocol.lastUpdatedAt = timestamp;
  protocol.save();

  updateSnapshot(intent, timestamp, amount, ZERO, isNewMerchantToday, amount);
}

export function handleRevoked(event: Revoked): void {
  let intent = PaymentIntent.load(intentIdOf(event.address));
  if (intent == null) return;

  let timestamp = event.block.timestamp;
  let unspent = intent.toppedUp.gt(intent.spent)
    ? intent.toppedUp.minus(intent.spent)
    : ZERO;

  intent.state = "Revoked";
  intent.revokedAt = timestamp;
  intent.revokedBy = Bytes.fromHexString(event.params.by.toHexString());
  intent.revokeReason = event.params.reason;
  intent.lastActivityAt = timestamp;
  intent.save();

  let rev = new Revocation(eventId(event));
  rev.intent = intent.id;
  rev.revokedBy = Bytes.fromHexString(event.params.by.toHexString());
  rev.reason = event.params.reason;
  rev.unspentAtRevocation = unspent;
  rev.timestamp = timestamp;
  rev.blockNumber = event.block.number;
  rev.txHash = event.transaction.hash;
  rev.save();

  let protocol = loadProtocol();
  protocol.revokedIntentCount = protocol.revokedIntentCount + 1;
  if (protocol.activeIntentCount > 0) {
    protocol.activeIntentCount = protocol.activeIntentCount - 1;
  }
  protocol.lastUpdatedAt = timestamp;
  protocol.save();
}

export function handleToppedUp(event: ToppedUp): void {
  let intent = PaymentIntent.load(intentIdOf(event.address));
  if (intent == null) return;

  let timestamp = event.block.timestamp;
  intent.toppedUp = intent.toppedUp.plus(event.params.amount);
  intent.lastActivityAt = timestamp;
  intent.save();

  let topUp = new TopUp(eventId(event));
  topUp.intent = intent.id;
  topUp.amount = event.params.amount;
  topUp.timestamp = timestamp;
  topUp.blockNumber = event.block.number;
  topUp.txHash = event.transaction.hash;
  topUp.save();

  updateSnapshot(intent, timestamp, ZERO, event.params.amount, false, ZERO);
}

export function handleWithdrawn(event: Withdrawn): void {
  let intent = PaymentIntent.load(intentIdOf(event.address));
  if (intent == null) return;

  let timestamp = event.block.timestamp;
  intent.withdrawn = intent.withdrawn.plus(event.params.amount);
  intent.lastActivityAt = timestamp;
  intent.save();

  let w = new Withdrawal(eventId(event));
  w.intent = intent.id;
  w.to = Bytes.fromHexString(event.params.to.toHexString());
  w.amount = event.params.amount;
  w.timestamp = timestamp;
  w.blockNumber = event.block.number;
  w.txHash = event.transaction.hash;
  w.save();
}

export function handleMerchantUpdated(event: MerchantUpdated): void {
  let intent = PaymentIntent.load(intentIdOf(event.address));
  if (intent == null) return;

  let timestamp = event.block.timestamp;
  let merchantBytes = Bytes.fromHexString(
    event.params.merchant.toHexString()
  );

  // Maintain the denormalised allowlist so a client can render an intent
  // without a second query.
  let current = intent.allowedMerchants;
  let next: Bytes[] = [];
  for (let i = 0; i < current.length; i++) {
    if (current[i].notEqual(merchantBytes)) next.push(current[i]);
  }
  if (event.params.allowed) {
    next.push(merchantBytes);
    intent.hasRestrictedMerchants = true;
  }
  intent.allowedMerchants = next;
  intent.lastActivityAt = timestamp;
  intent.save();

  let mu = new MerchantUpdate(eventId(event));
  mu.intent = intent.id;
  mu.merchant = merchantBytes;
  mu.allowed = event.params.allowed;
  mu.timestamp = timestamp;
  mu.blockNumber = event.block.number;
  mu.txHash = event.transaction.hash;
  mu.save();
}
