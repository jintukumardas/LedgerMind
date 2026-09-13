# AI usage disclosure

The ETHOnline 2026 work in this repository was written in a pair-programming
session with Claude Code (Claude Opus 5). This is an honest account of what the
model did, what it did not decide, and where it was wrong.

## What the AI did

- Wrote the subgraph: [`schema.graphql`](packages/subgraph/schema.graphql),
  [`subgraph.yaml`](packages/subgraph/subgraph.yaml),
  [`src/factory.ts`](packages/subgraph/src/factory.ts),
  [`src/intent.ts`](packages/subgraph/src/intent.ts),
  [`src/shared.ts`](packages/subgraph/src/shared.ts), and the hand-written ABIs.
- Wrote the `/api/v1` routes, the OpenAPI document, and the subgraph client.
- Replaced ~210 lines of hardcoded responses in `personal-assistant.tsx` with a
  call to the analysis endpoint.
- Wrote [`scripts/seed-demo-intents.mjs`](scripts/seed-demo-intents.mjs) and
  [`scripts/bazantic-ab.mjs`](scripts/bazantic-ab.mjs).
- Drafted [`docs/bazantic/recipe.md`](docs/bazantic/recipe.md) and this
  repository's documentation, including the README rewrite.
- Ran the secret scan across full git history and derived the compromised
  address from the leaked key.

## What the AI did not decide

- **Which tracks to enter.** The human cut the Ledger track after the model
  reported that Key Ring's `ring init` needs a physical device.
- **Whether to spend testnet funds.** The model asked before running the
  seeding script and waited for approval.
- **Whether to rewrite git history.** The model found the leaked key, reported
  it, and explicitly did not rewrite history without a decision. The human
  chose not to.
- **Whether to keep using the compromised wallet.** The human decided; the
  model recorded the risk.
- **Scope and priorities under the deadline.** The human set them.

## Where the AI was wrong

These are real errors from this session, not hypotheticals.

1. **Got the deadline badly wrong by trusting the brief.** The task description
   said "assume ~72 hours". The model worked from that until it checked the
   ETHGlobal event page and found the deadline was **8.7 hours away**. It should
   have verified the deadline before planning against it, not after.

2. **Misread Ledger Key Ring as a signer.** The initial plan assumed Key Ring
   could gate transactions with device confirmation. It cannot — it is
   secrets-at-rest encryption (AES-256-GCM), and per the docs only `ring init`
   touches the device; `encrypt`/`decrypt` do not. Device confirmation needs
   `@ledgerhq/device-signer-kit-ethereum` plus DMK, a separate integration. The
   model caught this by reading the docs before writing code, but only because
   it was told to.

3. **Claimed The Graph did not support Sei testnet.** The model read
   [the supported-networks page](https://thegraph.com/docs/en/supported-networks/),
   saw only `sei-mainnet`, and reported that contracts would need redeploying to
   mainnet. That was wrong. The networks registry lists `sei-atlantic`
   (`eip155:1328`) with Studio subgraph support; the docs page was simply
   incomplete. Checking the machine-readable registry rather than the prose page
   corrected it.

4. **Described PaymentIntent as a minimal proxy.** In an early summary the model
   said the factory deploys clones, and that the subgraph would need to handle
   that. Reading
   [`PaymentIntentFactory.sol`](contracts/PaymentIntentFactory.sol) showed it
   uses `Create2.deploy` with full creation code. The subgraph uses a standard
   dynamic data source template.

5. **Wrote a `createIntent` ABI missing a struct field.** The first run of the
   seeding script reverted with no reason data because the model's hand-written
   ABI omitted `bytes32 salt` from `CreateParams` — 8 fields instead of 9,
   producing selector `0x47e7def0` instead of `0x66c88173`. Cost one failed
   transaction.

6. **Wrote a full-history secret scan that returned garbage.** The first attempt
   matched 64-hex strings inside `logo.png` and reported forty false positives,
   then a second attempt was O(commits × files) and had to be killed after
   timing out. The working version was a single-pass `git log -p` restricted to
   text extensions.

7. **Broke dependency resolution once.** `npm install @anthropic-ai/sdk` in
   `apps/web` hit a pre-existing zod peer conflict; the model retried with
   `--legacy-peer-deps`, which pruned 421 packages. It verified the tree was
   still intact afterwards, but should have checked the conflict before
   reaching for the flag.

8. **Nearly overclaimed a security fix.** After removing
   `NEXT_PUBLIC_AGENT_PRIVATE_KEY` from `.env.example`, the model ran a grep to
   confirm nothing referenced it. The grep was silently swallowed by a zsh glob
   error (`--include=*.ts` with no matching file), returned nothing, and the
   model briefly concluded the variable was unused. It is in fact still read by
   `apps/web/src/lib/agent-wallet.ts`. Re-running the search correctly caught
   it, and the documentation now says "not fixed" instead of implying it was.
   A grep that errors is not a grep that found nothing.

9. **Shipped a counting bug that only live data exposed.** The first deployed
   subgraph (v0.0.1) reported `uniqueMerchantCount: 0` on every daily snapshot,
   including days with two payments. `loadMerchant` initialises `lastPaidAt` to
   the current timestamp, so the `lastPaidAt < dayStart(timestamp)` test could
   never be true for a first-time merchant. Caught only by querying the
   deployed subgraph and reading the numbers against what had been seeded —
   `graph build` and `tsc` both passed happily. Fixed in v0.0.2 by treating
   `paymentCount == 0` as new-today explicitly.

10. **Cited line numbers that pointed at the wrong code.** The write-up of the
    old indexer's defects cited `indexer.ts:105`, `:163-170` and `:196-198`.
    The real lines at the baseline tag are **76**, **161-167** and **205-207**.
    The defects themselves were real and correctly described — the model had
    read the file's contents, then wrote line numbers from memory of the
    reading order rather than checking. Caught when the demo recording rendered
    `sed -n '103,106p'` and displayed a function signature under a caption
    claiming it showed the data-loss bug. Line references are now verified with
    `grep -n` against the tagged file.

## Verification

Nothing in the judged path is model output taken on trust:

- `graph codegen` and `graph build` pass — the mappings compile to WASM.
- `npx tsc --noEmit` passes in `apps/web`.
- The seeded intents are real transactions on Sei Atlantic testnet; addresses
  and blocks are in [`docs/demo-intents.json`](docs/demo-intents.json) and can
  be checked on <https://seitrace.com/?chain=atlantic-2>.
- The A/B harness refuses to run without a live API.
- Claims about the old indexer's defects cite line numbers in
  [`packages/mcp/src/indexer.ts`](packages/mcp/src/indexer.ts) at the baseline
  tag.

## Commit history

Work was committed incrementally with descriptive messages. Commits authored in
this session carry a `Co-Authored-By: Claude Opus 5` trailer.
