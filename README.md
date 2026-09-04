<p align="center">
  <img src="logo.png" alt="LedgerMind" width="120" />
</p>

# LedgerMind

Giving an AI agent a wallet key gives it unlimited authority. Revoking that
authority means rotating the key, and auditing what it did means trusting logs
the agent itself wrote. LedgerMind replaces the key with a **payment intent**: a
contract that holds funds and enforces a total cap, a per-transaction cap, a
time window, and an optional merchant allowlist. The agent can spend inside
those bounds and nowhere else; the payer can revoke at any time; and every
payment commits on-chain to a hash of the off-chain context that justified it.

Deployed on Sei Atlantic testnet (`eip155:1328`).

---

## What existed before ETHOnline 2026

Everything in this section was built for a previous hackathon and is frozen at
the [`pre-ethonline-2026`](https://github.com/jintukumardas/LedgerMind/tree/pre-ethonline-2026)
tag (commit `9b9a304`). Use that tag to diff what is new.

| Area | What was there |
|---|---|
| Contracts | [`PaymentIntent.sol`](contracts/PaymentIntent.sol), [`PaymentIntentFactory.sol`](contracts/PaymentIntentFactory.sol) (CREATE2 deployment, caps, merchant allowlist, revocation), [`AgentMarketplace.sol`](contracts/AgentMarketplace.sol) |
| MCP server | [`packages/mcp`](packages/mcp) — five tools: `create_intent`, `execute_payment`, `revoke_intent`, `list_intents`, `top_up_intent` |
| Indexing | [`packages/mcp/src/indexer.ts`](packages/mcp/src/indexer.ts) — a polling PostgreSQL indexer |
| Dashboard | [`apps/web`](apps/web) — Next.js 14, wagmi/viem, intent management, transaction history, IPFS receipts |
| Assistant | `personal-assistant.tsx` — labelled "Development Mode … simulated AI responses" |
| Agent SDK | [`packages/agent-goat`](packages/agent-goat), [`packages/cambrian`](packages/cambrian) |

### Known problems at that tag

These are the specific defects the work below addresses, not a general critique:

1. **A live private key was committed in `README.md`** as a literal in a
   `claude mcp add` example — used for both `PRIVATE_KEY_PAYER` and
   `PRIVATE_KEY_AGENT`. Public since 2025-08-24.
2. **`NEXT_PUBLIC_AGENT_PRIVATE_KEY`** in `.env.example` — the `NEXT_PUBLIC_`
   prefix inlines a signing key into the browser bundle.
3. **The indexer could silently lose data.** `fromBlock = max(lastProcessed + 1,
   currentBlock - 1000)`: at Sei's ~400 ms blocks, any downtime beyond ~6.7
   minutes skips events permanently, with no backfill.
4. **The assistant queried nothing.** ~210 lines of hardcoded strings,
   including invented market data ("24h Volume: $12.4M", "USDC-SEI pools: ~8.5%
   APY").

---

## What we built during the event

### 1. The Graph — subgraph replaces the PostgreSQL indexer

[`packages/subgraph`](packages/subgraph) ([README](packages/subgraph/README.md))

- Factory data source handles `IntentCreated` and spawns a **dynamic data
  source template** per intent. Intents are full CREATE2 deployments, not
  proxies, so each needs its own source.
  → [`src/factory.ts`](packages/subgraph/src/factory.ts)
- Template indexes `Executed`, `Revoked`, `ToppedUp`, `Withdrawn`,
  `MerchantUpdated`. → [`src/intent.ts`](packages/subgraph/src/intent.ts)
- Schema adds `IntentDailySnapshot` rollups and denormalised `remainingCap` /
  `capUtilizationBps`, so the assistant filters and charts without RPC calls.
  → [`schema.graphql`](packages/subgraph/schema.graphql)

The [subgraph README](packages/subgraph/README.md) documents seven specific
defects in the old indexer with line references, and which of them the subgraph
fixes structurally.

### 2. The Graph — the assistant now reasons over indexed data

[`apps/web/src/app/api/v1/analyze/route.ts`](apps/web/src/app/api/v1/analyze/route.ts)

Pulls the payer's intents, payments and daily rollups in one query, normalises
units, and asks Claude for **ranked findings and concrete actions** —
`revoke_intent`, `withdraw_remainder`, `reduce_total_cap`, `restrict_merchants`
— each with the USDC it recovers and the evidence behind it. Returns the
`facts` it reasoned from so every claim is checkable.

`personal-assistant.tsx` now calls this endpoint. The ~210 lines of canned
responses are gone. When the subgraph is unreachable the assistant says so
rather than serving stale data — there is no mock fallback anywhere in the path.

### 3. Bazantic — HTTP API, OpenAPI spec, and Recipe

| Piece | Where |
|---|---|
| `GET /api/v1/intents` | [route](apps/web/src/app/api/v1/intents/route.ts) |
| `GET /api/v1/intents/{address}` | [route](apps/web/src/app/api/v1/intents/%5Baddress%5D/route.ts) |
| `GET /api/v1/payments` | [route](apps/web/src/app/api/v1/payments/route.ts) |
| `POST /api/v1/analyze` | [route](apps/web/src/app/api/v1/analyze/route.ts) |
| OpenAPI 3.1 document | [`lib/openapi.ts`](apps/web/src/lib/openapi.ts), served at `/api/v1/openapi` |
| Recipe draft | [`docs/bazantic/recipe.md`](docs/bazantic/recipe.md) |
| A/B harness | [`scripts/bazantic-ab.mjs`](scripts/bazantic-ab.mjs) → results in [`docs/bazantic-ab/`](docs/bazantic-ab) |

Every response carries `source.indexedBlock` so a calling agent can judge
freshness for itself.

The A/B harness runs the same tasks twice against the same live API with the
same model, settings and tool definitions — both arms are built from the same
objects in the script. The only difference is whether the Recipe is in the
system prompt. It refuses to run if the API probe fails, so results are never
produced against fixtures.

### 4. Security

The committed private key was replaced with a placeholder and the wallet
treated as permanently compromised. A full-history scan (`git log -p --all`
across all text files) found no other real secrets — every other match is a
`your_*_here` placeholder. Details in [`SUBMISSIONS.md`](SUBMISSIONS.md).

---

## Architecture

```
                 +------------------------------+
   payer ------->|  PaymentIntentFactory        |
                 |  CREATE2 -> one contract each|
                 +---------------+--------------+
                                 | IntentCreated
                                 v
                 +------------------------------+
   agent ------->|  PaymentIntent               |
   (capped)      |  totalCap / perTxCap         |
                 |  time window / allowlist     |
                 |  revocable by payer          |
                 +---------------+--------------+
                                 | Executed, ToppedUp,
                                 | Revoked, Withdrawn
                                 v
                 +------------------------------+
                 |  Subgraph (sei-atlantic)     |  <- replaces the
                 |  dynamic template per intent |     Postgres indexer
                 |  + daily rollups             |
                 +---------------+--------------+
                                 | GraphQL
                 +---------------+--------------+
                 v                              v
   +------------------------+     +------------------------+
   |  /api/v1/* (OpenAPI)   |     |  Dashboard + assistant |
   |  -> Bazantic Gateway   |     |  findings + actions    |
   +------------------------+     +------------------------+
```

---

## Setup from a clean clone

Requires Node 20+, and [Foundry](https://book.getfoundry.sh/) only if you want
to compile or deploy contracts.

```bash
git clone https://github.com/jintukumardas/LedgerMind.git
cd LedgerMind
npm install
```

### 1. Configure

```bash
cp .env.example .env
```

Fill in `.env`. **Never paste a private key into a shell command or a
`claude mcp add` invocation** — it lands in your shell history and in the MCP
client's config file. Put it in `.env`, which is gitignored.

| Variable | Purpose |
|---|---|
| `SEI_RPC_HTTP` | Sei Atlantic RPC (default works) |
| `FACTORY_ADDRESS` | `0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7` |
| `USDC_ADDRESS` | `0x4fCF1784B31630811181f670Aea7A7bEF803eaED` |
| `PRIVATE_KEY_PAYER` | Funds and owns intents. Testnet key only. |
| `PRIVATE_KEY_AGENT` | Spends within caps. Testnet key only. |
| `SUBGRAPH_URL` | Query URL from Subgraph Studio |
| `GRAPH_API_KEY` | API key from Subgraph Studio |
| `ANTHROPIC_API_KEY` | Required for `/api/v1/analyze` |

### 2. Deploy the subgraph

```bash
cd packages/subgraph
npm install
npm run codegen && npm run build
npx graph auth <DEPLOY_KEY>      # from thegraph.com/studio
npm run deploy
```

Copy the resulting query URL into `SUBGRAPH_URL`. Full instructions and a
freshness check: [`packages/subgraph/README.md`](packages/subgraph/README.md).

### 3. Run the dashboard

```bash
cd apps/web
npm run dev          # http://localhost:3000
```

Verify the API is live:

```bash
curl -s localhost:3000/api/v1/intents | jq '.source'
```

### 4. Run the MCP server (optional)

```bash
cd packages/mcp && npm install && npm run build
claude mcp add ledgermind -- node "$PWD/dist/index.js"
```

The server reads credentials from `.env`. See [`agent-setup.md`](agent-setup.md).

---

## Repository layout

| Path | Contents |
|---|---|
| [`contracts/`](contracts) | Solidity sources and interfaces |
| [`packages/subgraph/`](packages/subgraph) | Subgraph — schema, manifest, mappings |
| [`packages/mcp/`](packages/mcp) | MCP server and tools |
| [`apps/web/`](apps/web) | Next.js dashboard and `/api/v1` |
| [`scripts/`](scripts) | Seeding and the Bazantic A/B harness |
| [`docs/`](docs) | Recipe, A/B results, demo script |

## Documents

- [`SUBMISSIONS.md`](SUBMISSIONS.md) — per-track requirement to artifact checklist
- [`AI_USAGE.md`](AI_USAGE.md) — what AI tooling did, and where it was wrong
- [`docs/demo-script.md`](docs/demo-script.md) — shot list per track
- [`SETUP.md`](SETUP.md) — detailed setup
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

## License

MIT — see [LICENSE](LICENSE).
