# LedgerMind Subgraph

Indexes `PaymentIntentFactory` and every `PaymentIntent` it deploys on
**Sei Atlantic testnet** (`sei-atlantic`, `eip155:1328`).

This replaces the PostgreSQL indexer at `packages/mcp/src/indexer.ts`, which is
kept in the tree for comparison but is no longer the data path for the
dashboard, the MCP tools, or the spending assistant.

## Why the Postgres indexer was replaced

These are defects in the committed code, not general arguments against
Postgres. Line references are to `packages/mcp/src/indexer.ts` at the
[`pre-ethonline-2026`](https://github.com/jintukumardas/LedgerMind/tree/pre-ethonline-2026)
tag.

| # | Defect | Where | Consequence |
|---|--------|-------|-------------|
| 1 | Hard 1000-block lookback: `fromBlock = Math.max(lastProcessed + 1, currentBlock - 1000)` | `indexer.ts:76` | Sei produces ~400 ms blocks, so 1000 blocks is **~6.7 minutes**. Any downtime longer than that silently skips events forever — there is no backfill path. |
| 2 | No reorg handling | throughout | Only a block *number* is persisted, never a block hash. A reorged event stays in Postgres permanently and nothing ever reconciles it. |
| 3 | No historical backfill | `indexer.ts:76` | On a fresh database the indexer starts at `currentBlock - 1000`, so every intent created before that moment is invisible. |
| 4 | O(N) RPC fan-out per tick | `indexer.ts:161-167` | `processIntentEvents` loops over every known intent and issues 4 `queryFilter` calls each, every 10 s. At 100 intents that is 2,400 RPC calls/minute and it grows without bound. |
| 5 | Per-event RPC amplification | `indexer.ts:205-207` | Each `Executed` event triggers `getBlock` + `getTransaction` + `waitForTransaction` + `limits()`. `waitForTransaction` on an already-mined historical transaction is a pointless blocking round trip. |
| 6 | Requires hosted Postgres + a long-running process | `database/client.ts` | Infra to run, pay for, and monitor. The subgraph has none. |
| 7 | Not portable across chains | `config.ts` | Re-pointing at another network means re-running the same fragile process against a second RPC endpoint. |

The subgraph fixes 1–5 structurally: Graph Node tracks block hashes and handles
reorgs, indexes contiguously from `startBlock` with no gap window, and reads
events from Firehose rather than polling `eth_getLogs` per contract.

## Indexed range

The factory (`0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7`) was deployed at block
**192,211,126** (2025-08-16). The chain is now past block 270,800,000 — roughly
**78 million blocks** later. A full backfill does not complete inside the event
window, so `startBlock` is **270,805,800**, immediately before the first intent
created during ETHOnline 2026.

Consequence, stated plainly: the ten intents created in August 2025 are **not**
in this subgraph. Every intent it contains was created live during the event.
To index the full history instead, set `startBlock: 192211126` in
`subgraph.yaml` and allow many hours for the initial sync.

### Live data created during the event

Seeded by `scripts/seed-demo-intents.mjs` on Sei Atlantic testnet, payer
`0x0bD89b308B2497e79b48cF52163fDc98aC5663c2`. Each intent exercises a different
branch of the spending analysis:

| Intent | Address | Shape |
|---|---|---|
| `throttled` | `0x4E0866D3C7Ac1ACBD4058Cc9a0877193E640bcf4` | 2 payments at 98% of perTxCap — agent is cap-throttled |
| `over-authorised` | `0xb530E9CA418560028Db414E09Aa36617A89E7cA7` | 50 USDC cap against 0.1 USDC spent |
| `unrestricted` | `0x568222982112B7BD55Bd90524E1434472F422f5b` | empty merchant allowlist — may pay any address |
| `revoked-idle` | `0xE88B02aBD36A10617386cD71105FF39276ccdf16` | revoked with 0.8 USDC recoverable via `withdrawRemainder` |

Full record: `docs/demo-intents.json`.

## Entities

| Entity | Purpose |
|--------|---------|
| `PaymentIntent` | One per intent contract. Running `spent`, `remainingCap`, `toppedUp`, state. |
| `Payment` | One per `Executed` event, with `spentAfter` and `capUtilizationBps`. |
| `TopUp`, `Withdrawal`, `Revocation`, `MerchantUpdate` | Immutable event records. |
| `Payer`, `Agent`, `Merchant` | Rollups per address. |
| `IntentDailySnapshot` | Per-intent, per-UTC-day aggregation for the assistant. |
| `Protocol` | Singleton counters, id `"global"` (`0x676c6f62616c`). |

`IntentDailySnapshot` exists because the old assistant pulled every payment row
and summed them in JavaScript — which stops working after a few hundred
payments.

## Build

```bash
cd packages/subgraph
npm install
npm run codegen
npm run build
```

## Deploy to Subgraph Studio

1. Sign in at <https://thegraph.com/studio/> with a wallet.
2. Create a subgraph named **ledgermind**, network **Sei Atlantic Testnet**.
3. Copy the deploy key, then:

```bash
cd packages/subgraph
npx graph auth <DEPLOY_KEY>
npm run deploy          # prompts for a version label, e.g. v0.0.1
```

### Live deployment

Deployed to Subgraph Studio during ETHOnline 2026:

```
https://api.studio.thegraph.com/query/1760259/ledgermind/v0.0.2
```

Studio project: <https://thegraph.com/studio/subgraph/ledgermind>
Deployment CID (v0.0.2 mappings): see Studio. Network: **Sei Atlantic Testnet**.

Studio shows sync progress. Once it reads `Synced`, copy the **query URL** into
the repo root `.env`:

```bash
SUBGRAPH_URL=https://api.studio.thegraph.com/query/<ID>/ledgermind/<VERSION>
GRAPH_API_KEY=<api key from Studio>
```

The web app reads both (`apps/web/src/lib/subgraph.ts`). There is no mock
fallback — if the subgraph is unreachable the API returns `503`, so a broken
indexer is visible rather than silently papered over.

## Verify it has live data

```bash
curl -s -X POST "$SUBGRAPH_URL" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ _meta { block { number } hasIndexingErrors } protocol(id:\"0x676c6f62616c\") { intentCount paymentCount totalVolume } }"}' | jq
```

## Local Graph Node (optional)

```bash
docker compose -f docker-compose.graph.yml up -d
npm run create:local
npm run deploy:local
```
