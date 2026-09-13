# Bazantic A/B run

- Model: `claude-opus-5`
- API: `http://localhost:3050`
- Payer: `0x0bD89b308B2497e79b48cF52163fDc98aC5663c2`
- Timestamp: 2026-09-13T08-35-05-067Z

| Task | Arm | Turns | Tool calls | In tok | Out tok |
|---|---|---|---|---|---|
| idle-capital | A_no_recipe | 2 | 2 | 9180 | 1424 |
| idle-capital | B_with_recipe | 2 | 1 | 11242 | 1145 |
| risk-review | A_no_recipe | 2 | 2 | 9049 | 1212 |
| risk-review | B_with_recipe | 2 | 1 | 10888 | 922 |
| budget-left | A_no_recipe | 2 | 1 | 3357 | 1467 |
| budget-left | B_with_recipe | 2 | 2 | 12970 | 1109 |
| merchant-lookup | A_no_recipe | 2 | 2 | 5026 | 856 |
| merchant-lookup | B_with_recipe | 2 | 2 | 9165 | 762 |
| expiry-check | A_no_recipe | 2 | 2 | 8967 | 1212 |
| expiry-check | B_with_recipe | 2 | 2 | 13359 | 2073 |
| throttle-diagnosis | A_no_recipe | 2 | 2 | 9537 | 1248 |
| throttle-diagnosis | B_with_recipe | 2 | 2 | 13006 | 1341 |

## Final answers

### idle-capital

> I've been letting agents spend on my behalf for a while. Is any of my money just sitting there doing nothing? If so, how much, and what do I do about it?

#### A_no_recipe

I'll pull your intents and run the spending analysis.
**Short answer: yes, but only $0.80 of it is truly stranded.** Your balances are small overall — $67 authorized, $1.28 actually spent across 4 intents.

## Money doing nothing

**Recoverable now: 0.80 USDC** — intent `0xe88b02…` ("Marketing tools trial - Q3"). You revoked it ("Trial ended, tool not adopted") after one $0.20 payment, but left $1.00 funded. It can never spend again, so that balance is dead weight. Call `withdrawRemainder` on it — zero downside.

**Not idle, just float: 0.82 USDC** sitting in the three Active intents ($0.30 + $0.30 + $0.22). That's working capital, not waste — though `0x568222…` ("General ops agent") has made **zero payments ever**, so its $0.30 is the least justified.

## The bigger issue: standing authority, not idle cash

You've authorized 67 USDC against 1.28 spent (1.9% used). Unused cap isn't locked funds, but it's permission an agent can draw on at any moment:

- **`0xb530e9…`** (research subscriptions): $50 cap, $0.10 spent — 500x over-authorized. Cut the cap.
- **`0x568222…`** (general ops): $10 cap with an **empty merchant allowlist** — it can pay literally any address, and has no payment history to justify that. This is your only real containment gap; the other three are pinned to a single merchant each. Restrict it before funding it further.

## One thing that's under-provisioned

**`0x4e0866…`** (cloud infra autopay): both payments landed at $0.49 against a $0.50 per-tx cap — 98% twice in a row. The cap is shaping your payment sizes, not bounding them. Its total cap is also 49% consumed. Raise both, or expect failed payments.

## Caveats worth knowing

Two things limit how far I'd push the cap-resizing advice. First, **every payment on record happened on a single day** (2026-09-13) despite my looking back 180 days — so there's no real run-rate to size new caps against, and the "98% per-tx" pattern rests on just two transactions. Second, the `idleDays` field came back as 0 on all four intents, including the revoked one with an unspent balance, so it's clearly unpopulated — I couldn't age the idle funds, only confirm the balance exists.

Also: the `agent` on all four intents is your own wallet address, not a separate agent address. If you expected third-party agents to be spending here, that's worth a look.

**Do today:** withdraw from `0xe88b02…` ($0.80), lock the allowlist on `0x568222…`. **This week:** reduce the $50 cap on `0xb530e9…`, raise the per-tx cap on `0x4e0866…` once you know your actual GPU/storage invoice size.

#### B_with_recipe

I'll run LedgerMind's analysis over your intents.
**Short answer: yes, but it's small — 0.80 USDC is strictly stranded, and about 1.62 USDC total is funded-but-unspent. The bigger problem isn't idle cash, it's idle *authority*: 67 USDC authorised against 1.28 USDC actually spent.** Risk level: medium.

**What to do, in order:**

1. **Withdraw 0.80 USDC now** from `0xe88b02ab…` ("Marketing tools trial – Q3"). It's already Revoked ("Trial ended, tool not adopted"), funded with 1.00 USDC, and only 0.20 USDC was ever spent. Nothing can spend the rest — `withdrawRemainder` recovers it outright.

2. **Revoke `0x56822298…`** ("General ops agent – discretionary spend") — this is the one I'd act on even though it holds only 0.30 USDC. It has a **10 USDC cap, 2 USDC per transaction, and no merchant allowlist at all**, meaning the agent key can pay *any* address. It has made **zero payments in 90 days**. There's no usage to protect, so you're carrying uncontained exposure for nothing. Revoking also frees its 0.30 USDC. If you still want an ops agent, recreate it with a merchant allowlist.

3. **Cut the total cap on `0xb530e9ca…`** ("Research paper + dataset subscriptions") this week. It's authorised for 50 USDC — your largest — against 0.10 USDC spent (0.2% used). Dropping it to ~2–5 USDC still leaves 10x+ headroom and removes ~45 USDC of unused authority. Its allowlist is scoped to one merchant, so this is lower urgency.

**One thing going the other way:** `0x4e0866d3…` (cloud infra autopay) isn't idle — it's *constrained*. Both its payments were 0.49 USDC against a 0.50 USDC per-transaction cap (98% utilisation, twice). That usually means the cap is sized just under the real invoice. It's also used 49% of its 2 USDC total cap on day one of a weekly schedule, so it will likely run dry. Worth checking the actual invoice and raising both caps.

**Caveats worth knowing:** all four payments are timestamped within a two-minute span, and `dailySpend` covers a single day despite a 90-day window — this looks like a seeded/test dataset, so the spending-rate inferences rest on just 4 transactions. Also, `idleDays` is 0 on every intent including the revoked one, so there's no signal on how long that 0.80 USDC has actually been stranded, and there's no funding history to tell whether low balances are deliberate drip-funding or unfinished top-ups. Merchants are raw addresses with no labels. Data is current as of indexed block 270,809,533 on Sei Atlantic, no indexing errors.

### risk-review

> Is my agent spending money sensibly? Anything I should be worried about?

#### A_no_recipe

I'll pull your intents and recent payments, plus run the built-in analysis.
**Short answer:** the actual spending is fine — 1.28 USDC spent against 67 USDC authorized. The problems are in how the intents are *configured*, not what was bought. Overall risk: **medium**.

## What was actually spent (last 30 days)
| Intent | Purpose | Spent | Cap | Used |
|---|---|---|---|---|
| `0x4e0866` | Cloud infra autopay | 0.98 | 2 | 49% |
| `0xe88b02` | Marketing trial (Revoked) | 0.20 | 5 | 4% |
| `0xb530e9` | Research/datasets | 0.10 | 50 | 0.2% |
| `0x568222` | General ops (discretionary) | 0.00 | 10 | 0% |

All 4 payments have receipts, none exceeded a per-tx cap, and every intent that actually transacted is pinned to a single merchant. That part is clean.

## Three things worth your attention

**1. Open-ended discretionary intent (highest risk)**
`0x568222` is Active with **no merchant allowlist at all** and a 10 USDC cap — yet it has made zero payments in 30 days. There's no usage history justifying an unrestricted allowlist. Pin it to specific merchants, or revoke it since it's never been used.

**2. Possible duplicate or split charge on cloud infra**
Two identical **0.49 USDC** payments hit merchant `0x1111…` **7 seconds apart**, each at 98% of the 0.5 per-tx cap. That's either a ~0.98 invoice being split into two txs to slip under the cap, or a duplicate/retry. Worth checking directly — if it's a split, your per-tx cap is defeating its own purpose and should be sized to the real invoice (~1.0–1.2). Note it also burned 49% of a *weekly* intent's total cap on day one.

**3. Oversized authorization on research intent**
`0xb530e9` authorizes 50 USDC against 0.10 spent. Dropping to ~5 USDC still leaves 50x headroom and removes 45 USDC of standing exposure — the single biggest risk reduction available.

**Also:** the revoked marketing intent `0xe88b02` has **0.8 USDC stranded**. Call `withdrawRemainder` to reclaim it.

## One caveat on the data
All four payments landed within a **64-second span on 2026-09-13**, despite the 30-day window. So there's no real spending history here — this looks like a freshly set-up or test wallet. Any conclusion about burn rate or "correct" cap sizing rests on a single day of activity, and the two 0.49 charges can't be confirmed as duplicate vs. split without the receipt contents. Treat the cap recommendations as directional until you have a few weeks of real usage.

#### B_with_recipe

I'll run LedgerMind's analysis over your intents.
**Verdict: the spending itself is fine — the *authorisations* are the problem.** Risk level: medium.

Your agent has spent **$1.28 total** across 4 payments, all receipted, all to the single merchant each intent was scoped to. No off-allowlist spend, no anomalies. But you've authorised **$67** against that $1.28 of actual use.

**Two things to fix now:**

1. **Withdraw $0.80 from `0xe88b…df16`** (marketing trial, revoked). You funded $1.00, the agent spent $0.20, and the rest is stranded — it's the entirety of your idle capital. Riskless to recover.

2. **Restrict merchants on `0x5682…2f5b`** ("General ops agent – discretionary spend"). This is the one that should bother you: **$10 total cap, $2 per-tx, and an empty allowlist** — meaning the agent can pay *any* address. It has made **zero payments**, so there's no usage history justifying that openness. If you can't name the merchants it needs, just revoke it; you'd lose nothing.

**Two to review this week:**

3. **`0x4e08…bcf4`** (cloud infra autopay) — both payments were $0.49 against a $0.50 per-tx cap, i.e. **98% utilisation twice in a row**. That's a cap sized just under the real invoice, not an agent picking amounts. It will start failing as usage grows. Consider raising per-tx to ~$0.75. Also note it burned **49% of its $2 total cap in a single day**.

4. **`0xb530…7ca7`** (research subscriptions) — $50 authorised, $0.10 spent (0.2% used). That's ~500x headroom. The allowlist is restricted to one merchant so the blast radius is contained, but cutting the total cap to single digits would remove ~$45 of standing exposure with no operational cost.

**Caveat on the data:** every payment falls on a single day (2026-09-13) despite a 90-day window, so there's no real trend or cadence baseline yet — the "weekly" claim on the infra intent isn't verifiable from spend history. Merchant addresses also have no names, so I can't tell you *which* counterparties to allowlist on the ops intent. Data is fresh (indexed block 270,809,814, no indexing errors).

### budget-left

> How much can my agents still spend right now, and which one has the most room?

#### A_no_recipe

I'll pull your active payment intents to see the remaining spend room.
## Your 3 active intents

| Intent | Label | Total cap | Spent | Remaining cap | Per-tx cap |
|---|---|---|---|---|---|
| `0xb530…7ca7` | Research paper + dataset subscriptions | 50.00 | 0.10 | **49.90** | 5.00 |
| `0x5682…2f5b` | General ops agent – discretionary | 10.00 | 0.00 | **10.00** | 2.00 |
| `0x4e08…bcf4` | Cloud infra autopay (GPU + storage) | 2.00 | 0.98 | **1.02** | 0.50 |

**Total remaining authorization: 60.92 tokens** (token `0x4fcf…eaed`, amounts shown assuming 6 decimals).

**Most room: the research/dataset intent** (`0xb530…7ca7`) — 49.90 left, 99.8% of its cap unused, and only 1 payment made so far. It's also merchant-restricted to `0x2222…2222`, so that headroom can only go to that one merchant.

## One important caveat

Authorization ≠ available funds. Each intent also reports a `toppedUp` amount, which looks like escrow funding, and it's far below the caps:

- `0xb530…`: topped up 0.40, spent 0.10 → ~0.30 actually fundable
- `0x5682…`: topped up 0.30, spent 0.00 → ~0.30
- `0x4e08…`: topped up 1.20, spent 0.98 → ~0.22

If that reading is right, your agents can only spend **~0.82 tokens right now** despite 60.92 in approved headroom — and the cloud infra agent is closest to running dry (0.22 left, under its own 0.50 per-tx cap, so its next full-size payment would fail). I can't fully confirm `toppedUp` semantics from this data alone; it may exclude an initial deposit. Worth verifying escrow balances directly before relying on the 60.92 figure.

Two other things worth noting: all three intents list the agent address as your own wallet, so they're distinguishable only by label, not by a distinct agent key. And all three expire around the same time (~unix 1791879000).

#### B_with_recipe

I'll pull your authorization analysis and intent list together.
**Short answer: 60.92 USDC of authority, but only 0.82 USDC actually funded — and it's all one agent, not several.**

All four intents point at the same agent address (`0x0bd8…63c2`, which is also your own address), so there's no cross-agent comparison to make. The ranking below is by intent.

**Remaining room across the 3 Active intents (all ~30 days left to run):**

| Intent | Purpose | Remaining cap | Actually funded & unspent |
|---|---|---|---|
| `0xb530e9…7ca7` | Research + dataset subs | **49.90 USDC** | 0.30 USDC |
| `0x568222…2f5b` | General ops discretionary | 10.00 USDC | 0.30 USDC |
| `0x4e0866…bcf4` | Cloud infra autopay | 1.02 USDC | 0.22 USDC |
| **Total** | | **60.92 USDC** | **0.82 USDC** |

(`0xe88b02…df16` is Revoked — no room, but it's holding 0.80 USDC of idle capital you can pull back with `withdrawRemainder`.)

**Most room: `0xb530e9…7ca7`** — 49.90 USDC, 82% of all remaining headroom, against just 0.10 USDC ever spent (0.2% of cap). That's roughly a 500x over-authorisation and the clearest thing to trim.

**Two things worth flagging:**
- Funding, not caps, is the real constraint right now. If someone topped these up, the blast radius jumps to 60.92 USDC immediately.
- `0x568222…2f5b` has an **empty merchant allowlist** — 10 USDC payable to *any* address, with zero payments in 90 days. Restrict or revoke it.

Data is current (indexed block 270,809,999, no indexing errors). Caveat: all four payments landed within ~1 minute on 2026-09-13, so there's no real spend trend to extrapolate from.

### merchant-lookup

> How much have I paid the merchant at 0x1111111111111111111111111111111111111111 in total, and roughly how big were those payments relative to what the agent is allowed to send in one go?

#### A_no_recipe

I'll pull your payments to that merchant and your intents to see the per-payment caps.
**Total paid to `0x1111…1111`: 980,000 units — 2 payments of 490,000 each** (if the token is 6-decimal, that's ~$0.98 total, $0.49 each).

All of it went through one intent:
- **Intent `0x4e0866d3…bcf4`** — "Cloud infra autopay - GPU + storage, weekly", Active, merchant-restricted to exactly this merchant.
- **Per-tx cap: 500,000** → each payment was **490,000 = 98% of the max allowed in a single transfer** (the indexer confirms `capUtilizationBps: 9800` on both).
- **Total cap: 2,000,000**, spent 980,000 → **49% used**, 1,020,000 remaining.

So: the agent isn't just nibbling at its limit — it's pushing right up against the per-transaction ceiling every single time, twice in a row, ~7 seconds apart (timestamps 1789286981 and 1789286988). Two payments back-to-back at 98% of cap is the classic shape of an agent sizing transfers *to* the limit rather than to an actual invoice, and the receipt URIs (`ipfs://demo/throttled/…`) suggest it was being throttled and retried rather than billed.

Worth a look before the remaining 1,020,000 goes the same way: at this rate that's two more near-cap payments and the intent is drained. If the real weekly infra bill isn't ~490,000, consider lowering `perTxCap` on this intent so a runaway loop can't spend the rest in a few seconds.

#### B_with_recipe

I'll pull the payments to that merchant and your intents so I can tie them to the right per-transaction caps.
**Total paid to merchant 0x1111…1111: 0.98 USDC** across 2 payments.

Both came from intent `0x4e0866d3c7ac1acbd4058cc9a0877193e640bcf4` ("Cloud infra autopay - GPU + storage, weekly"), which allowlists only that merchant.

**Relative to the per-transaction cap: they're maxed out.**
- Per-tx cap on that intent: **0.50 USDC**
- Each payment: **0.49 USDC** → `capUtilizationBps` of **9800 = 98% of the ceiling**, on both payments

Two-for-two at 98% of the limit is the signature of an agent being **throttled** — it likely wants to send more per transaction than the cap allows and is either splitting invoices or truncating them. Worth checking: the intent has spent 0.98 of a 2.00 USDC total cap (1.02 USDC authority left) but only holds 1.20 USDC topped up, so it can fund roughly two more payments at this size before running dry.

If these are genuine weekly infra bills, consider raising `perTxCap`; if not, the repeated near-ceiling amounts deserve a look at the receipts before the next cycle.

Data is current as of indexed block 270,810,066 with no indexing errors.

### expiry-check

> Which of my authorisations are dead or about to die? I don't want to find out an agent stopped working because something lapsed.

#### A_no_recipe

I'll pull your intents and check their states and expiry timelines.
# Short answer: nothing is expired, and nothing expires in the next 30 days. But one intent is dead, and one is at real risk of silently failing.

## Dead
**`0xe88b…df16` — "Marketing tools trial - Q3"** — **Revoked** on 2026-09-13 ("Trial ended, tool not adopted"). It can't pay anything again. **0.80 USDC of your funding is still sitting in it** — withdraw the remainder.

## Expiry timeline
All four intents end at **`endTime` 1791878965–1791879029**, i.e. **~13 Oct 2026** — roughly 30 days out. No 7- or 14-day cliff to worry about right now. Worth noting they all share the same ~30-day horizon, which looks like a default rather than a deliberate per-intent choice; if you want the infra autopay to outlive the research subscriptions, that's a decision you haven't actually made yet.

## The more likely cause of an agent "stopping" before any expiry
**`0x4e08…bcf4` — "Cloud infra autopay"** is the one to watch. Both payments landed at **0.49 USDC against a 0.50 per-tx cap (98%)**, and it's already burned **49% of its 2 USDC total cap in one day**. Two separate failure modes ahead of the October expiry:
- A weekly invoice above 0.50 USDC will be **rejected by the per-tx cap**.
- At the current burn rate the **2 USDC total cap runs out well before 13 Oct** — and only 0.22 USDC of funding is left in it.

That's the one that will lapse first, and it won't be because of a date.

## Live but fine on expiry
- `0xb530…7ca7` — Research subscriptions. Active, 0.2% of a 50 USDC cap used. Separately: 50 USDC is 75% of your total authorised value for 0.10 USDC of actual spend — oversized, worth trimming.
- `0x5682…2f5b` — General ops. Active, **0 payments ever**, but **no merchant allowlist** on a 10 USDC cap. Not an expiry risk; it's an exposure one. If you can't name a counterparty for it, it has no purpose and should be revoked and drained.

**Do now:** withdraw the 0.80 USDC from the revoked marketing intent; raise the per-tx cap and top up the cloud infra autopay before the next weekly invoice.

One caveat on the data: the analysis endpoint returns expiry only as a relative `endsInDays`, so I read the absolute dates off the raw `endTime` fields in the intent list — those agree at ~13 Oct, but confirm on-chain before you act on tight timing. The withdrawable balance on the revoked intent is also worth re-checking on-chain, as no funding tx hash was exposed.

#### B_with_recipe

I'll pull your full intent set plus LedgerMind's analysis.
## Nothing has lapsed yet — but one agent will break ~4 weeks before anything expires

**The real answer to your question:** expiry is not your near-term failure mode. Funding exhaustion is.

### Dead now (1)
- **`0xe88b…df16` — "Marketing tools trial - Q3"** — Revoked by you ("Trial ended, tool not adopted"). Spent 0.20 of 1.00 USDC funded. **0.80 USDC is stranded in it** — call `withdrawRemainder` to recover it.

### About to die silently (1) — this is the one to act on
- **`0x4e08…bcf4` — "Cloud infra autopay - GPU + storage, weekly"**
  - Funded balance left: **0.22 USDC**. Recurring charge to merchant `0x1111…`: **0.49 USDC**.
  - **The next charge cannot clear.** The intent will still read `Active`, still be un-revoked, still show 1.02 USDC of remaining cap — and the payment just won't land. Exactly the failure you said you don't want.
  - Even after a top-up, the **2 USDC total cap** only permits two more 0.49 charges before it binds.
  - Both observed payments used **98% of the 0.50 per-tx cap**. Any price rise from that merchant breaks the charge outright, with no warning.

### Expiry cliff (all 4)
I checked the raw `endTime` values rather than trusting the rounded "30 days" figure — this is a **genuine synchronised cliff**, not a placeholder:

| Intent | Purpose | Expires (UTC) |
|---|---|---|
| `0x4e08…bcf4` | Cloud infra autopay | 2026-10-13 08:09:25 |
| `0xb530…7ca7` | Research + dataset subs | 2026-10-13 08:09:52 |
| `0x5682…2f5b` | General ops discretionary | 2026-10-13 08:10:10 |
| `0xe88b…df16` | Marketing trial (revoked) | 2026-10-13 08:10:29 |

All four land within **64 seconds of each other**, ~30 days out. Both recurring agents — cloud infra and research subscriptions — stop at the same instant. There's no staggering and no renewal logic visible in the indexed data.

### Do this
1. **Now:** top up `0x4e08…bcf4`, and raise its 2 USDC total cap in the same operation if you want continuity past two cycles. Top-up alone only buys you two more charges.
2. **Now:** `withdrawRemainder` on `0xe88b…df16` → recovers **0.80 USDC**, which covers the cloud-infra shortfall outright.
3. **Before 2026-10-13:** re-issue the two recurring intents on staggered end dates so a missed renewal takes down one workload, not all of them.

**Caveats:** the "weekly" cadence for the cloud-infra intent comes from its label, not observed timing — all 4 payments in the window fired within ~65 seconds on 2026-09-13, so I can't date the funding exhaustion, only confirm the next charge fails. There's also no auto-renew or grace-period field indexed, so I can't tell whether the 10-13 expiry hard-stops the agents or triggers a re-auth flow — worth confirming on your side. Data is current: block 270810362, no indexing errors.

### throttle-diagnosis

> My cloud infra agent keeps making payments that look suspiciously similar in size. Is something wrong with it?

#### A_no_recipe

I'll pull your intents and recent payments to see what's going on.
**Short answer: your instinct is right, but there are only two payments, so "suspicious" is as far as the data goes.**

**The intent:** `0x4e08…bcf4` — "Cloud infra autopay - GPU + storage, weekly", 0.50 USDC per-tx cap, 2.00 USDC total cap, merchant locked to `0x1111…1111`.

**What it did:**

| Time (2026-09-13) | Amount | % of per-tx cap |
|---|---|---|
| 08:09:41Z | 0.49 USDC | 98% |
| 08:09:48Z | 0.49 USDC | 98% |

Two byte-identical payments to the same merchant, **7 seconds apart**, each pinned just under the ceiling.

**Why that's a flag:**
- Identical amounts sitting at 98% of the cap is the shape you'd expect if one larger charge got sliced into cap-sized pieces.
- Equally consistent with a **retry that settled twice** — a duplicate charge.
- The intent says *weekly*, but both landed in the same minute. Cadence doesn't match its own description.
- It burned **49% of the total cap** in that 7-second window. Only 0.22 USDC of funding remains, so the next 0.49 charge fails on funding before it even hits the cap — that's an outage risk for infra autopay.

**Honest caveat:** I can't tell splitting from duplication from here. Receipts exist for both payments, but the subgraph doesn't expose invoice contents, nonces, or retry flags — the one field that would settle it. And two payments in a single 65-second burst is no baseline; there's no multi-day history to compare against. The "weekly" mismatch is suggestive, not proof.

**What I'd do now:** drop the per-tx cap below 0.49 on `0x4e08`. That forces the agent to fail loudly instead of quietly settling a possible duplicate, and it costs you nothing while you check the provider's invoice for 2026-09-13. Normally 98% utilisation would mean the cap is too *tight* and should be raised — don't do that here until you've confirmed the two charges are genuinely separate obligations.

Two unrelated things the scan surfaced, worth a look when convenient:
- `0xe88b` (marketing trial) is **revoked** with **0.80 USDC stranded** — withdrawable immediately, no downside.
- `0x5682` ("General ops - discretionary") is Active with a **10 USDC cap and an empty merchant allowlist** — it can pay any address. Only 0.30 USDC funded today, so blast radius is small, but that changes the moment it's topped up. It has zero payment history, so pinning an allowlist now breaks nothing.

#### B_with_recipe

I'll start with LedgerMind's analysis over your intents, plus a list of what you've authorised.
**Short answer: the agent isn't malfunctioning or double-paying — it's hitting your per-transaction ceiling.** But the intent is about to run out of money, which is the real problem.

**What's happening on `0x4e0866…bcf4` ("Cloud infra autopay - GPU + storage, weekly")**

- Both payments are **exactly 0.49 USDC** — that's **98% of the 0.50 USDC per-tx cap** (`capUtilizationBps` 9800 on both).
- Repeated settlement pinned at the ceiling is the signature of a cap-throttled agent, not coincidence. Either the real invoice is being sliced into cap-sized pieces, or the charge is being clipped to fit.
- Both went to the **same allowlisted merchant `0x1111…1111`** (the only address permitted), **seconds apart**, and **both carry receipts**. So this is in-policy, authorised spend — not an unauthorised leak or a rogue loop.

**The urgent bit — the next payment will fail**

- Funded: 1.20 USDC · Spent: 0.98 USDC · **Remaining balance: 0.22 USDC**
- Each observed payment costs 0.49 USDC, so **0.22 < 0.49 — the next weekly charge cannot settle.**
- Note `remainingCap` shows 1.02 USDC of *authority* left, but only 0.22 USDC of actual *money*. Authority ≠ funds.

**What to do**

1. **Top up `0x4e0866…bcf4` now** — fund it toward the 2 USDC total cap if you still want the service running.
2. **Then check the merchant's real invoice before raising the per-tx cap.** If the true charge is ~0.49 USDC, leave the cap alone. If it's higher and being split, raise the cap to match the invoice. Don't raise it blind.

**Caveats from the data:** receipts don't expose line-item amounts, so I can't confirm whether 0.49 is the genuine price or a truncated slice. Also, all four payments landed within about a minute on 2026-09-13 — there's no multi-week history to verify the "weekly" cadence, and no failed/reverted attempts are indexed, which would have confirmed cap-retry behaviour outright.

**Unrelated, but worth knowing while you're in here:**
- `0x568222…2f5b` ("General ops agent") has **no merchant allowlist** — the agent can pay *any* address, up to 2 USDC per tx and 10 USDC total if funded. Zero payments in 90 days. Restrict it or revoke it.
- `0xe88b02…df16` (revoked marketing trial) holds **0.80 USDC idle** — recoverable now via `withdrawRemainder`.

*Data current as of indexed block 270810693 on Sei Atlantic, no indexing errors.*
