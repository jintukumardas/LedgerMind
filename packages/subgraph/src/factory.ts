import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { IntentCreated } from "../generated/PaymentIntentFactory/PaymentIntentFactory";
import { PaymentIntent as PaymentIntentContract } from "../generated/PaymentIntentFactory/PaymentIntent";
import { PaymentIntent } from "../generated/schema";
import { PaymentIntent as PaymentIntentTemplate } from "../generated/templates";
import { ZERO, loadAgent, loadPayer, loadProtocol } from "./shared";

export function handleIntentCreated(event: IntentCreated): void {
  let intentAddress = event.params.intent;
  let timestamp = event.block.timestamp;

  let payer = loadPayer(event.params.payer, timestamp);
  let agent = loadAgent(event.params.agent, timestamp);

  let intent = new PaymentIntent(
    Bytes.fromHexString(intentAddress.toHexString())
  );
  intent.payer = payer.id;
  intent.agent = agent.id;
  intent.salt = event.params.salt;

  // The constructor args are not in the event, so read the immutables back
  // from the contract. These are single calls at creation time only - the
  // old Postgres indexer re-read limits() on every single payment.
  let bound = PaymentIntentContract.bind(intentAddress);

  let tokenCall = bound.try_token();
  intent.token = tokenCall.reverted
    ? Bytes.empty()
    : Bytes.fromHexString(tokenCall.value.toHexString());

  let limitsCall = bound.try_limits();
  if (!limitsCall.reverted) {
    intent.totalCap = limitsCall.value.totalCap;
    intent.perTxCap = limitsCall.value.perTxCap;
    intent.startTime = limitsCall.value.start;
    intent.endTime = limitsCall.value.end;
  } else {
    intent.totalCap = ZERO;
    intent.perTxCap = ZERO;
    intent.startTime = ZERO;
    intent.endTime = ZERO;
  }

  let metaCall = bound.try_metadataURI();
  intent.metadataURI = metaCall.reverted ? "" : metaCall.value;

  let restrictedCall = bound.try_hasRestrictedMerchants();
  intent.hasRestrictedMerchants = restrictedCall.reverted
    ? false
    : restrictedCall.value;

  intent.spent = ZERO;
  intent.remainingCap = intent.totalCap;
  intent.toppedUp = ZERO;
  intent.withdrawn = ZERO;
  intent.state = "Active";
  intent.allowedMerchants = [];
  intent.createdAt = timestamp;
  intent.createdAtBlock = event.block.number;
  intent.createdTxHash = event.transaction.hash;
  intent.lastActivityAt = timestamp;
  intent.paymentCount = 0;
  intent.save();

  payer.intentCount = payer.intentCount + 1;
  payer.totalAuthorized = payer.totalAuthorized.plus(intent.totalCap);
  payer.lastActiveAt = timestamp;
  payer.save();

  agent.intentCount = agent.intentCount + 1;
  agent.lastActiveAt = timestamp;
  agent.save();

  let protocol = loadProtocol();
  protocol.intentCount = protocol.intentCount + 1;
  protocol.activeIntentCount = protocol.activeIntentCount + 1;
  protocol.totalAuthorized = protocol.totalAuthorized.plus(intent.totalCap);
  protocol.lastUpdatedAt = timestamp;
  protocol.save();

  // Spawn a data source so this intent's own events are indexed from here on.
  PaymentIntentTemplate.create(intentAddress);
}
