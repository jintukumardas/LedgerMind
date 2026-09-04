# Demo shot lists

One per track. Record separately — the tracks have different length limits.

Both open on the same premise, stated in one sentence: *an AI agent with a
wallet key has unlimited authority; LedgerMind replaces the key with a capped,
revocable, auditable contract.*

---

## 1. The Graph — AI Tooling / AI Use Case (2–4 min, Continuity pool)

The arc: **the old indexer could lose your data and the assistant made things
up — now neither is true.**

### Shot 1 — the before (0:00–0:35)

- `git checkout pre-ethonline-2026` in a second terminal.
- Open `packages/mcp/src/indexer.ts`, scroll to line 105. Read the line aloud:

  ```js
  const fromBlock = Math.max(lastProcessed + 1, currentBlock - 1000);
  ```

  Say: *"Sei produces a block every 400 milliseconds. A thousand blocks is
  under seven minutes. If this indexer is down for longer than that, those
  events are gone — there is no backfill."*
- Open `personal-assistant.tsx` at the same tag. Show the banner:
  **"Development Mode — simulated AI responses"**, then scroll to the hardcoded
  `"24h Volume: $12.4M"` and `"USDC-SEI pools: ~8.5% APY"`.
  Say: *"None of this was ever queried. It is typed into the source."*

### Shot 2 — the subgraph (0:35–1:20)

- Show [`packages/subgraph/schema.graphql`](../packages/subgraph/schema.graphql)
  briefly — `PaymentIntent`, `Payment`, `IntentDailySnapshot`.
- Show [`src/factory.ts`](../packages/subgraph/src/factory.ts): the
  `PaymentIntentTemplate.create(intentAddress)` line. Say: *"Each intent is its
  own CREATE2 contract, so each gets its own data source spawned at creation."*
- Cut to Subgraph Studio: status **Synced**, network **Sei Atlantic**.
- Run the freshness query live:

  ```bash
  curl -s -X POST "$SUBGRAPH_URL" -H 'Content-Type: application/json' \
    -d '{"query":"{ _meta { block { number } } protocol(id:\"0x676c6f62616c\") { intentCount paymentCount totalVolume } }"}' | jq
  ```

  Point at the block number. Say: *"That is live testnet data, indexed during
  this event."*

### Shot 3 — reasoning, not printing (1:20–2:30)

- Open the dashboard, connect the payer wallet.
- Click **"Find idle capital"**.
- Read the response on screen. Land on the specific action:
  `withdraw_remainder` on `0xE88B02aB…` — *"0.8 USDC sitting in a revoked
  intent, recoverable."* And `restrict_merchants` on `0x56822298…` — *"this one
  can pay any address on the network."*
- Say: *"It did not print a query result. It ranked findings, picked actions,
  and priced them."*
- Show the returned `facts` block briefly: *"and it returns what it reasoned
  from, so every number is checkable."*

### Shot 4 — no fallback (2:30–3:00)

- Unset `SUBGRAPH_URL`, reload, ask again.
- Assistant says it has no live data and will not guess.
- Say: *"There is no mock path. If the indexer is down, you get told, not a
  stale number."*

### Close (3:00–3:20)

- Show `SUBMISSIONS.md` §1 — requirement-to-artifact table.
- Say: *"Continuity pool. The baseline tag is `pre-ethonline-2026`; everything
  shown after shot one was built during the event."*

---

## 2. Bazantic — Help an Agent Use Your Hackathon Project (2–3 min)

The arc: **same model, same API, same prompt — the Recipe is the only
difference, and it changes the answer.**

### Shot 1 — the API (0:00–0:30)

- `curl -s $API/api/v1/openapi | jq '.paths | keys'` — four endpoints.
- `curl -s "$API/api/v1/intents?payer=0x0bD8…" | jq '.source'` — point at
  `indexedBlock`. Say: *"Every response tells the caller how fresh it is."*

### Shot 2 — the controlled variable (0:30–1:00)

- Open [`scripts/bazantic-ab.mjs`](../scripts/bazantic-ab.mjs), show `ARMS`:

  ```js
  const ARMS = {
    A_no_recipe:   BASE_SYSTEM,
    B_with_recipe: `${BASE_SYSTEM}\n\n---\n\n${RECIPE}`,
  };
  ```

  Say: *"Same tasks, same tools, same model, same settings — they are the same
  objects. The Recipe is appended to arm B and nothing else changes."*
- Show the probe that exits if the API is not live.

### Shot 3 — run it (1:00–1:45)

- `node scripts/bazantic-ab.mjs`
- Let the table print: turns and tool calls per arm.
- Open `docs/bazantic-ab/run-*/SUMMARY.md` side by side.

### Shot 4 — the difference (1:45–2:40)

Read the two answers to *"Is any of my money sitting idle?"*

- **Arm A** — whatever it produced from the bare OpenAPI descriptions. Call out
  concretely what went wrong: wrong units, listing raw intents instead of
  answering, or extra calls to get there.
- **Arm B** — the specific answer: the revoked intent, the recoverable amount in
  USDC, and `withdrawRemainder` as the mechanism.
- Say: *"The Recipe tells the agent that `toppedUp - spent` on a revoked intent
  is recoverable capital, and that amounts are 6-decimal base units. Without
  that it has the data and still gets the answer wrong."*

### Close (2:40–3:00)

- Show the Gateway and Recipe on bazantic.com.
- State your Bazantic username on screen.

---

## Recording notes

- Keep the terminal font large; judges watch these small.
- Do not cut away during a live `curl` — the point is that it is live.
- Say the baseline tag name out loud once per video.
- Ledger track is not submitted; do not mention it.
