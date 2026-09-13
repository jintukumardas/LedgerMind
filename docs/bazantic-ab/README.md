# Bazantic A/B: does the Recipe change the outcome?

Harness: [`scripts/bazantic-ab.mjs`](../../scripts/bazantic-ab.mjs).

## Method

Two arms, run against the same live LedgerMind API:

| Held constant | Value |
|---|---|
| Model | `claude-opus-5` |
| `max_tokens` | 8000 |
| Turn budget | 12 |
| Tool definitions | the same `TOOLS` array |
| Task prompts | the same `TASKS` array |
| API endpoint + data | the same running server, same payer |

The single difference:

```js
const ARMS = {
  A_no_recipe:   BASE_SYSTEM,
  B_with_recipe: `${BASE_SYSTEM}\n\n---\n\n${RECIPE}`,
};
```

`RECIPE` is read verbatim from [`docs/bazantic/recipe.md`](../bazantic/recipe.md)
— the same text registered on bazantic.com, so the two cannot drift apart.
Each run directory contains `inputs.json` with both system prompts recorded in
full, so the claim "the Recipe was the only variable" is checkable rather than
asserted.

The harness probes the API before starting and exits non-zero if it is not
live. No run directory can contain fixture-derived output.

## Tasks

Six, in two groups.

**Group 1 — open-ended judgement** (`idle-capital`, `risk-review`,
`budget-left`). These map onto `POST /api/v1/analyze`, which performs the
reasoning server-side.

**Group 2 — field-level reading** (`merchant-lookup`, `expiry-check`,
`throttle-diagnosis`). These deliberately avoid questions the analysis endpoint
answers outright, forcing the agent to read raw fields and interpret them. They
probe the specific traps the Recipe documents:

- amounts are 6-decimal base units, not whole USDC
- `state: "Active"` with a past `endTime` is effectively expired
- `capUtilizationBps` is share of per-transaction cap in basis points
- `remainingCap` is authority, not money in the contract

## Findings

Two full runs, six tasks each, on two models. Both are kept because the
comparison between them is itself the finding.

| Run | Model | Directory |
|---|---|---|
| Primary | `claude-haiku-4-5` | `run-2026-09-13T08-48-29-792Z` |
| Secondary | `claude-opus-5` | `run-2026-09-13T08-35-05-067Z` |

### Primary run (Haiku 4.5): the Recipe changes the answer

Arm A fails in three concrete, quotable ways. All three are mistakes the
Recipe explicitly warns about.

**1. `budget-left` — arm A's answer is unusable.**

> **A (no Recipe):** "Remaining: **10,000,000** … **49,900,000** … **1,020,000**
> … **Total Remaining Capacity: 60,920,000**"

> **B (with Recipe):** a USDC table — "General ops **10.00 USDC**, Research
> subscriptions **49.90 USDC**, Cloud infra **1.02 USDC**. Most room:
> `0xb530e9ca` with **49.90 USDC**." Plus: "**Critical issue:** your first two
> intents have remainingCap far exceeding the funded balance."

Arm A reports 60,920,000 as a spending capacity. A human reading that sees
sixty million dollars of authority; the real figure is **60.92 USDC**. Arm B
also catches the authority-vs-liquidity distinction, which the Recipe calls out
("`remainingCap` is authority, not money").

**2. `merchant-lookup` — arm A never converts at all.**

> **A:** "Total paid to that merchant: **980,000 tokens** … 2 payments of
> **490,000 tokens** each … Per-transaction cap: **500,000 tokens**"

> **B:** "Total paid to that merchant: **0.98 USDC** (980,000 base units) …
> per-transaction cap of 500,000 base units (**0.5 USDC**) … Payment 1:
> **0.49 USDC** — 98% of the per-tx cap"

Arm A invents the unit "tokens" and leaves the reader to guess the decimals.

**3. `expiry-check` — arm A hallucinates dates.**

> **A:** "REVOKED on **Jan 9, 2025**" … "All three of your Active
> authorizations expire on **Jan 19, 2025**" … "Cap: 10M", "Cap: 50M, spent
> 100K of 50M"

The intents were created and revoked on **2026-09-13** and expire around
**2026-10-13**. Arm A is off by roughly twenty months, and returns to raw units
("10M", "50M"). Arm B answered from the analysis endpoint, named the revoked
intent and the $0.80 correctly, and made no date claim it could not support.

On the remaining three tasks (`idle-capital`, `risk-review`,
`throttle-diagnosis`) both arms were broadly correct — those questions route to
`/api/v1/analyze`, which normalises units server-side before the model ever
sees them, so there is nothing left for the Recipe to fix. Arm A did
over-count idle capital on `idle-capital` ("$0.53 in idle/unspent money",
then listing $0.80 + $0.30), while arm B correctly scoped idle capital to the
revoked intent only.

**Score on Haiku 4.5: 3 clear wins for the Recipe, 1 partial, 2 draws.**

### Secondary run (Opus 5): the gap narrows

The same six tasks on `claude-opus-5` produced **no correctness failures in
either arm**. Arm A converted units correctly and reached sound conclusions
unaided. The only measurable differences were routing and cost:

| Task | A tool calls | B tool calls |
|---|---|---|
| idle-capital | 2 (`list_intents`, `analyze_spending`) | 1 (`analyze_spending`) |
| risk-review | 2 (`list_intents`, `analyze_spending`) | 1 (`analyze_spending`) |
| budget-left | 1 (`list_intents`) | 2 |

Arm B went straight to the analysis endpoint, which is what the Recipe
instructs. Arm A explored first and arrived at the same place.

The one exception was `merchant-lookup`, where even Opus hedged — "980,000
units … **if the token is 6-decimal**, that's ~$0.98" — against arm B's flat
"0.98 USDC". The unit trap is the most durable of the Recipe's contributions.

### Honest summary

The Recipe's value is **inversely proportional to model strength and to how
much judgement the API already encodes server-side**:

- On **Haiku 4.5** it is the difference between a usable answer and one that
  misstates a balance by six orders of magnitude.
- On **Opus 5** it mainly saves a round trip and fixes one hedge.
- On questions routed to `/api/v1/analyze`, it changes little, because that
  endpoint already normalises units and ranks findings before the model sees
  anything.

We are not claiming the Recipe rescues every agent. It rescues cheap ones, on
exactly the field-level traps it documents — which is the case that matters,
because cheap models are what most agent deployments actually run.

## Reproducing

```bash
export ANTHROPIC_API_KEY=...
export LEDGERMIND_API=http://localhost:3050     # or the deployed URL
export PAYER=0x0bD89b308B2497e79b48cF52163fDc98aC5663c2
node scripts/bazantic-ab.mjs
```

Each run writes `docs/bazantic-ab/run-<timestamp>/` containing:

- `<task>.<arm>.json` — full transcript including every tool call, the exact
  URL hit, HTTP status, latency, and the response body
- `inputs.json` — model, settings, tools, tasks, and both system prompts
- `SUMMARY.md` — the comparison table and both final answers per task
