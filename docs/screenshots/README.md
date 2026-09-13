# Screenshots

All captured from the running app or from real terminal sessions. The dashboard
shots have a wallet connected, so every figure is live subgraph data from Sei
Atlantic testnet.

## Product (web UI, light theme)

| File | Shows | Track |
|---|---|---|
| `01-overview.png` | What a payment intent is | — |
| `02-dashboard-subgraph-data.png` | Active authorities, total spent, intent count — all read from the subgraph in one request | The Graph |
| `03-payment-intents.png` | Per-intent caps, spend progress, expiry | The Graph |
| `04-spending-assistant.png` | Ranked findings and concrete actions over indexed data | The Graph |
| `05-create-intent.png` | Setting total cap, per-tx cap, window, merchant allowlist | — |

## The Graph — Continuity pool

| File | Shows |
|---|---|
| `06-continuity-baseline-diff.png` | The old indexer's 1000-block lookback bug, read out of the `pre-ethonline-2026` tag |
| `07-subgraph-live-query.png` | The deployed subgraph answering, with block height and no indexing errors |
| `08-assistant-ranked-actions.png` | `/api/v1/analyze` returning typed actions with the capital each recovers |
| `14-api-response-source.png` | Every API response carries `source.indexedBlock` |

## MCP

| File | Shows |
|---|---|
| `10-mcp-tools-list.png` | Real JSON-RPC handshake and the five tools an agent gets |
| `11-mcp-agent-creates-intent.png` | An agent creating a spending authority on-chain via `tools/call` |
| `12-mcp-subgraph-indexed.png` | The subgraph indexing that intent with no redeploy |

## Bazantic

| File | Shows |
|---|---|
| `09-bazantic-ab-result.png` | Both logged A/B answers side by side: `60,920,000` raw base units without the Recipe vs correct USDC with it |
| `13-openapi-spec.png` | The OpenAPI 3.1 document served at `/api/v1/openapi` |
