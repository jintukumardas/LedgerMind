# ETHGlobal submission form copy

Paste-ready. Character counts noted where the form enforces a limit.

---

## Short description (max 100 characters)

**Option A — 97 chars (recommended)**

```
On-chain spending limits for AI agents, indexed by The Graph and readable by other agents
```

**Option B — 89 chars**

```
Give an AI agent a budget, not your wallet key. Capped, revocable, indexed by The Graph
```

**Option C — 99 chars**

```
Payment intents for AI agents: hard caps, instant revocation, and a subgraph that proves it
```

---

## Description (min 280 characters)

```
Giving an AI agent a wallet key gives it unlimited authority over your funds.
Revoking that authority means rotating the key, and auditing what it did means
trusting logs the agent wrote about itself.

LedgerMind replaces the key with a payment intent: a smart contract that holds
funds and enforces four things on every payment — a total cap, a
per-transaction cap, a time window, and an optional merchant allowlist. The
agent holds a key that can only call execute() within those bounds. It never
holds your funds, it cannot exceed the caps, and you can revoke it at any time.
Every payment emits a receipt hash committing to the off-chain context that
justified it, so spending is auditable after the fact rather than on trust.

This project existed before ETHOnline 2026 and is frozen at the git tag
pre-ethonline-2026, so everything new can be diffed against it. Two things in
that baseline were broken, and both are what we fixed during the event.

First, the indexer could silently lose data. It only ever looked back 1000
blocks; Sei produces a block every ~400ms, so any downtime beyond ~6.7 minutes
skipped events permanently with no backfill, no reorg handling, and an RPC
fan-out that grew with every intent. We replaced it with a subgraph.

Second, the "assistant" queried nothing. It was ~210 lines of hardcoded strings
including invented market data — a fabricated 24h volume and APY typed into the
source. It now reads live subgraph data and returns ranked findings and typed
actions: revoke this intent, withdraw the remainder from that one, restrict the
merchants on a third — each naming a specific contract, how urgent it is, and
how much capital it recovers. It also returns the facts it reasoned from, so
every claim is checkable.

We also made the whole thing legible to other agents: an OpenAPI 3.1 document,
an MCP server exposing five tools, and a Bazantic Recipe whose effect we
measured in a controlled A/B rather than asserted.

Deployed on Sei Atlantic testnet. All data in the demo is live.
```

---

## How it's made (min 280 characters)

```
Contracts are Solidity on Sei Atlantic testnet (eip155:1328). A
PaymentIntentFactory deploys each PaymentIntent as a full CREATE2 contract —
not a minimal proxy — which matters downstream: the subgraph needs a dynamic
data source template spawned per intent rather than a single shared source.
The intent enforces totalCap, perTxCap, a start/end window, and an optional
merchant allowlist, and emits Executed / ToppedUp / Revoked / Withdrawn /
MerchantUpdated.

THE GRAPH (Continuity pool). We built a subgraph in packages/subgraph that
indexes the factory and every intent it deploys. The factory handler spawns a
PaymentIntent template per IntentCreated event; the template indexes all five
intent events. The schema adds things the old indexer never computed:
IntentDailySnapshot rollups, denormalised remainingCap, and capUtilizationBps
(what share of the per-transaction cap each payment consumed — repeated values
near 10000 mean an agent is being throttled by a mis-sized cap). Deployed to
Subgraph Studio on sei-atlantic.

The Graph is load-bearing, not decorative. The dashboard, the HTTP API, the MCP
server's list_intents tool and the assistant all read from it and nothing else.
There is deliberately no RPC or cached fallback anywhere in that path: pull the
subgraph and the API returns 503 and the assistant says it has no data rather
than guessing. The dashboard hook previously made 1 + 5N eth_calls per page
load; it is now a single request whose cost does not grow with the number of
intents.

The assistant (/api/v1/analyze) does the unit normalisation and every ratio in
TypeScript before the model sees anything, so the model's job is judgement, not
arithmetic. That let us run it on Claude Haiku 4.5 — roughly 5x cheaper and 2x
faster than Opus on the same payload — with a strict JSON schema for the output.

BAZANTIC. The same data is described as an OpenAPI 3.1 document served at
/api/v1/openapi and registered as an x402/MPP Gateway, plus a Recipe explaining
when an agent should reach for a payment intent and how to read the fields.
We then tested whether the Recipe actually changes anything, rather than
claiming it does. scripts/bazantic-ab.mjs runs six tasks twice against the same
live API; both arms are built from the same TASKS, TOOLS and model constants in
one file, and ARMS is literally {A: BASE_SYSTEM, B: BASE_SYSTEM + RECIPE}. Each
run logs both system prompts verbatim so "the Recipe was the only variable" is
checkable rather than asserted. The harness probes the API first and exits
non-zero if it is not live, so no run directory can contain fixture-derived
results.

The result, honestly: on Haiku the Recipe is the difference between a usable
answer and a wrong one — asked how much its agents can still spend, the
un-recipe'd agent answers "60,920,000" in raw base units, which a human reads
as sixty million dollars; the true figure is 60.92 USDC. It also leaves units
unconverted elsewhere and hallucinates dates. On Opus 5 the gap nearly vanishes
— neither arm fails, and the Recipe only saves a round trip. We wrote up the
three tasks where it made no measurable difference too.

MCP. packages/mcp exposes create_intent, execute_payment, revoke_intent,
list_intents and top_up_intent over JSON-RPC on stdio — the protocol Claude
Code and Claude Desktop speak. The agent never sees a private key; it calls
tools, the server holds the key, and the caps are enforced on-chain regardless.
list_intents was rewired from a 1 + 6N RPC fan-out to the subgraph during the
event.

Notably hacky bit: to record the demo against the real UI we inject a genuine
EIP-1193 provider into Playwright, backed by the actual payer key, with signing
done in Node and broadcast as a raw transaction. The wallet connects for real
and the intent created on camera is a real CREATE2 deployment — not a stub.

Stack: Solidity + Foundry, The Graph (AssemblyScript mappings), Next.js 14 with
wagmi/viem, TypeScript MCP server, Claude Haiku 4.5 for the analysis, Sei
Atlantic testnet.
```

---

## Notes

- Character counts: short description options are 97 / 89 / 99.
- The honest framing of the Bazantic A/B (including where the Recipe did not
  help) is deliberate — it is documented in `docs/bazantic-ab/README.md` and
  judges can verify it against the logged transcripts.
- Mistakes made during the build are disclosed in `AI_USAGE.md`.
