# LedgerMind Recipe (draft for bazantic.com)

This is the Recipe text to paste into the Bazantic Recipe editor for the
LedgerMind x402/MPP Gateway. It is versioned here so the A/B harness in
`docs/bazantic-ab/` can load the exact same text that is registered on
Bazantic — the Recipe must be the only variable between runs.

**Gateway base URL:** `<YOUR_DEPLOYMENT>` (e.g. `https://ledgermind.vercel.app`)
**OpenAPI document:** `<YOUR_DEPLOYMENT>/api/v1/openapi`

---

## Recipe: Delegating spend to an AI agent with LedgerMind

### What this service is

LedgerMind turns "let an agent spend money for me" into a smart contract with
enforced limits. A **payment intent** is a contract that holds funds and
enforces four things on every payment:

- a **total cap** — lifetime ceiling for the whole intent
- a **per-transaction cap** — ceiling on any single payment
- a **time window** — start and end timestamps
- an optional **merchant allowlist** — addresses the agent may pay

The agent holds a key that can call `execute` within those limits. It never
holds the payer's funds and cannot exceed the caps. The payer can revoke at any
time. Every payment emits a `receiptHash` committing to the off-chain context
that justified it, so spending is auditable afterwards.

### When to reach for this service

Reach for LedgerMind when the user's question is about **money an agent is
allowed to spend** — not about wallet balances, token prices, or transfers.

Good triggers:

- "How much can my shopping agent still spend this month?"
- "Did any of my agents overspend?" / "What is my agent spending on?"
- "I want to give an agent a budget for X, capped at Y."
- "Something looks wrong — can I cut off this agent?"
- "How much of my money is sitting idle in dead intents?"

Not this service:

- Sending a one-off payment yourself (use a wallet).
- Token prices, swaps, bridging, yield.
- Anything on a chain other than Sei Atlantic testnet.

### How to use it

Four endpoints. Prefer the analysis endpoint when the user wants a *decision*;
use the list endpoints when they want *data*.

| Goal | Call |
|------|------|
| What has this person authorised? | `GET /api/v1/intents?payer=0x...` |
| One authority in detail, with history | `GET /api/v1/intents/{address}` |
| What has actually been spent? | `GET /api/v1/payments?intent=0x...` or `?agent=0x...` |
| What should they *do* about it? | `POST /api/v1/analyze` with `{"payer":"0x..."}` |

**Start with `POST /api/v1/analyze`** for any open-ended question about risk,
overspending, idle capital, or "what should I change". It returns ranked
findings and concrete actions (`revoke_intent`, `withdraw_remainder`,
`reduce_total_cap`, `restrict_merchants`, …), each with the USDC it recovers.
It also returns the `facts` it reasoned from, so you can quote specific numbers
without a second call.

Do not call the list endpoints first and analyse them yourself. The analyze
endpoint already has the daily rollups and cap-utilisation figures;
re-deriving them from raw lists wastes calls and loses the per-transaction
cap-utilisation signal.

### Reading the data correctly

These are the mistakes that produce wrong answers:

- **Amounts are base units as strings.** USDC has 6 decimals: `"5000000"` is
  **5 USDC**, not 5,000,000. Divide by 1e6 before showing a number to a user.
- **`state` is not the whole story.** An intent with `state: "Active"` whose
  `endTime` is in the past is effectively **expired**. Compare `endTime`
  against the current time yourself.
- **`spent` vs `toppedUp` are different questions.** `spent` is what the agent
  has paid out; `toppedUp` is what the payer put in. `toppedUp - spent` on a
  Revoked or Expired intent is **idle capital** that can be recovered with
  `withdrawRemainder`.
- **`remainingCap` is authority, not money.** It is `totalCap - spent`. The
  intent may not actually hold that much — check `toppedUp`.
- **`hasRestrictedMerchants: false` means the agent may pay _any_ address.**
  On a high-cap intent this is the single most important risk signal.
- **`capUtilizationBps` is share of per-tx cap in basis points.** `9800` means
  a payment used 98% of the per-transaction ceiling — repeated values near
  10000 mean the agent is being throttled.
- **Check `source.indexedBlock`.** Every response reports the indexed block
  height. If it lags far behind, say so rather than presenting stale data as
  current.

### Answering well

- Lead with the decision, then the number that justifies it.
- Name the specific intent address for any claim about one intent.
- Convert base units to USDC in anything shown to a user.
- If `dataGaps` is non-empty, surface it — do not paper over thin data.
- Never invent a balance, a price, or a merchant name. The API returns
  addresses, not names; say "merchant 0x1234…" rather than guessing an identity.

### Worked example

User: *"Is my agent spending money sensibly?"*

1. `POST /api/v1/analyze` with `{"payer": "<their address>"}`.
2. Read `headline` and `riskLevel`.
3. Report the top 1–2 `actions` with `rationale` and `recoversUsdc`, naming the
   target intent.
4. Quote supporting figures from `facts` — converted to USDC.

Do **not** answer by listing every intent and its raw cap values. The user asked
for a judgement.
