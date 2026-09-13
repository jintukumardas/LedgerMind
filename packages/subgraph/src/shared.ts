import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Agent, Merchant, Payer, Protocol } from "../generated/schema";

export const ZERO = BigInt.fromI32(0);
export const SECONDS_PER_DAY = BigInt.fromI32(86400);
export const PROTOCOL_ID = Bytes.fromUTF8("global");

export function eventId(event: ethereum.Event): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32());
}

export function loadProtocol(): Protocol {
  let p = Protocol.load(PROTOCOL_ID);
  if (p == null) {
    p = new Protocol(PROTOCOL_ID);
    p.intentCount = 0;
    p.activeIntentCount = 0;
    p.revokedIntentCount = 0;
    p.paymentCount = 0;
    p.totalVolume = ZERO;
    p.totalAuthorized = ZERO;
    p.payerCount = 0;
    p.agentCount = 0;
    p.merchantCount = 0;
    p.lastUpdatedAt = ZERO;
  }
  return p as Protocol;
}

/**
 * Loads a Payer, creating it on first sight. Returns true via the protocol
 * counter side-effect so callers do not have to track "is new" themselves.
 */
export function loadPayer(addr: Address, timestamp: BigInt): Payer {
  let id = Bytes.fromHexString(addr.toHexString());
  let payer = Payer.load(id);
  if (payer == null) {
    payer = new Payer(id);
    payer.intentCount = 0;
    payer.totalSpent = ZERO;
    payer.totalAuthorized = ZERO;
    payer.firstSeenAt = timestamp;
    payer.lastActiveAt = timestamp;

    let p = loadProtocol();
    p.payerCount = p.payerCount + 1;
    p.lastUpdatedAt = timestamp;
    p.save();
  }
  return payer as Payer;
}

export function loadAgent(addr: Address, timestamp: BigInt): Agent {
  let id = Bytes.fromHexString(addr.toHexString());
  let agent = Agent.load(id);
  if (agent == null) {
    agent = new Agent(id);
    agent.intentCount = 0;
    agent.totalSpent = ZERO;
    agent.paymentCount = 0;
    agent.firstSeenAt = timestamp;
    agent.lastActiveAt = timestamp;

    let p = loadProtocol();
    p.agentCount = p.agentCount + 1;
    p.lastUpdatedAt = timestamp;
    p.save();
  }
  return agent as Agent;
}

export function loadMerchant(addr: Address, timestamp: BigInt): Merchant {
  let id = Bytes.fromHexString(addr.toHexString());
  let merchant = Merchant.load(id);
  if (merchant == null) {
    merchant = new Merchant(id);
    merchant.totalReceived = ZERO;
    merchant.paymentCount = 0;
    merchant.firstPaidAt = timestamp;
    merchant.lastPaidAt = timestamp;

    let p = loadProtocol();
    p.merchantCount = p.merchantCount + 1;
    p.lastUpdatedAt = timestamp;
    p.save();
  }
  return merchant as Merchant;
}

export function dayStart(timestamp: BigInt): BigInt {
  return timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY);
}
