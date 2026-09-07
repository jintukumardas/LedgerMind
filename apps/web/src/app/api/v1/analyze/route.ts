import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { spendingContext } from "@/lib/subgraph";
import { badRequest, fail, isAddress, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-opus-5";
const USDC_DECIMALS = 6;

function usdc(raw: string | number | bigint): number {
  return Number(BigInt(raw)) / 10 ** USDC_DECIMALS;
}

/**
 * Reduces the raw subgraph response into the compact, unit-normalised shape
 * the model reasons over. Doing the arithmetic here rather than in the prompt
 * keeps the model's job to judgement, not maths.
 */
function buildFacts(ctx: Awaited<ReturnType<typeof spendingContext>>) {
  const now = Math.floor(Date.now() / 1000);

  const intents = ctx.intents.map((i) => {
    const cap = usdc(i.totalCap);
    const spent = usdc(i.spent);
    const funded = usdc(i.toppedUp);
    const expired = Number(i.endTime) <= now;
    return {
      address: i.id,
      agent: i.agent.id,
      purpose: i.metadataURI || "(no metadata)",
      state: i.state === "Active" && expired ? "Expired" : i.state,
      totalCapUsdc: cap,
      perTxCapUsdc: usdc(i.perTxCap),
      spentUsdc: spent,
      fundedUsdc: funded,
      unspentFundedUsdc: Math.max(funded - spent, 0),
      capUsedPct: cap > 0 ? +((spent / cap) * 100).toFixed(1) : 0,
      paymentCount: i.paymentCount,
      merchantAllowlistSize: i.allowedMerchants.length,
      unrestrictedMerchants: !i.hasRestrictedMerchants,
      endsInDays: +((Number(i.endTime) - now) / 86400).toFixed(1),
      idleDays: +((now - Number(i.lastActivityAt)) / 86400).toFixed(1),
      revokeReason: i.revokeReason,
    };
  });

  const payments = ctx.payments.map((p) => ({
    intent: p.intent.id,
    merchant: p.merchant.id,
    amountUsdc: usdc(p.amount),
    perTxCapUsedPct: +(Number(p.capUtilizationBps) / 100).toFixed(1),
    at: new Date(Number(p.timestamp) * 1000).toISOString(),
    hasReceipt: !!p.receiptURI,
    txHash: p.txHash,
  }));

  const byMerchant = new Map<string, { usdc: number; count: number }>();
  for (const p of payments) {
    const m = byMerchant.get(p.merchant) ?? { usdc: 0, count: 0 };
    m.usdc += p.amountUsdc;
    m.count += 1;
    byMerchant.set(p.merchant, m);
  }

  return {
    generatedAt: new Date().toISOString(),
    intents,
    payments,
    merchantTotals: [...byMerchant.entries()]
      .map(([merchant, v]) => ({
        merchant,
        totalUsdc: +v.usdc.toFixed(2),
        count: v.count,
      }))
      .sort((a, b) => b.totalUsdc - a.totalUsdc),
    dailySpend: ctx.snapshots.map((s) => ({
      day: new Date(Number(s.dayStartTimestamp) * 1000)
        .toISOString()
        .slice(0, 10),
      intent: s.intent.id,
      spentUsdc: usdc(s.amountSpent),
      payments: s.paymentCount,
      uniqueMerchants: s.uniqueMerchantCount,
      largestUsdc: usdc(s.largestPayment),
    })),
    totals: {
      intentCount: ctx.intents.length,
      activeIntents: intents.filter((i) => i.state === "Active").length,
      authorizedUsdc: +intents.reduce((a, i) => a + i.totalCapUsdc, 0).toFixed(2),
      spentUsdc: +intents.reduce((a, i) => a + i.spentUsdc, 0).toFixed(2),
      idleCapitalUsdc: +intents
        .filter((i) => i.state !== "Active")
        .reduce((a, i) => a + i.unspentFundedUsdc, 0)
        .toFixed(2),
    },
  };
}

const SYSTEM = `You are LedgerMind's spending controller. You review on-chain
payment-intent data indexed by a subgraph and decide what the payer should do
about it.

You are not a chatbot and not a report generator. Produce judgements and
concrete actions, each tied to specific intent addresses and numbers drawn from
the facts you are given.

Rules:
- Use only the supplied facts. Never invent balances, prices, APYs, merchants,
  or market data. If the data is too thin to support a finding, say so in
  "dataGaps" rather than filling the gap with a guess.
- An intent is over-authorised when its cap greatly exceeds observed spend.
- Idle capital is funded-but-unspent value on a Revoked or Expired intent; it
  can be recovered with withdrawRemainder.
- An unrestricted merchant allowlist on a high-cap intent is a containment
  risk, not a style issue.
- Payments repeatedly landing near 100% of perTxCap suggest the agent is being
  throttled and the cap may be mis-sized.
- Rank actions by the capital or risk they actually address. Do not pad the
  list; returning two well-argued actions beats six generic ones.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "findings", "actions", "riskLevel", "dataGaps"],
  properties: {
    headline: {
      type: "string",
      description: "One sentence a payer would want to read first.",
    },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "evidence"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          evidence: {
            type: "array",
            items: { type: "string" },
            description: "Intent addresses, tx hashes, or figures supporting this.",
          },
        },
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["action", "target", "rationale", "urgency", "recoversUsdc"],
        properties: {
          action: {
            type: "string",
            enum: [
              "revoke_intent",
              "withdraw_remainder",
              "reduce_total_cap",
              "reduce_per_tx_cap",
              "raise_per_tx_cap",
              "restrict_merchants",
              "top_up_intent",
              "no_action",
            ],
          },
          target: { type: "string", description: "Intent address, or 'n/a'." },
          rationale: { type: "string" },
          urgency: { type: "string", enum: ["now", "this_week", "monitor"] },
          recoversUsdc: {
            type: "number",
            description: "Capital this action frees or protects; 0 if none.",
          },
        },
      },
    },
    dataGaps: { type: "array", items: { type: "string" } },
  },
} as const;

export async function POST(request: NextRequest) {
  let body: { payer?: string; question?: string; windowDays?: number };
  try {
    body = await request.json();
  } catch {
    return badRequest("body must be JSON");
  }

  const payer = body.payer;
  if (!isAddress(payer ?? null)) {
    return badRequest("payer must be a 0x address");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          type: "not_configured",
          message: "ANTHROPIC_API_KEY is not set on the server.",
        },
      },
      { status: 503 },
    );
  }

  const windowDays = Math.min(Math.max(body.windowDays ?? 90, 1), 365);
  const since = Math.floor(Date.now() / 1000) - windowDays * 86400;

  try {
    const ctx = await spendingContext(payer!, since);
    const facts = buildFacts(ctx);

    if (facts.intents.length === 0) {
      return ok({
        headline:
          "No payment intents found for this payer in the indexed range.",
        riskLevel: "low",
        findings: [],
        actions: [{
          action: "no_action",
          target: "n/a",
          rationale:
            "The subgraph has no intents for this address. Create one, or " +
            "check that the address is the payer rather than the agent.",
          urgency: "monitor",
          recoversUsdc: 0,
        }],
        dataGaps: ["No intents indexed for this payer."],
      }, { facts, model: MODEL });
    }

    const client = new Anthropic();
    const question =
      body.question?.trim() ||
      "Review this payer's agent spending authority and tell me what to change.";

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `${question}\n\nFacts from the LedgerMind subgraph (Sei Atlantic testnet), window = last ${windowDays} days:\n\n${JSON.stringify(facts, null, 2)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return fail(new Error("Model declined to answer"), 502);
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    let analysis: unknown;
    try {
      analysis = JSON.parse(text);
    } catch {
      return fail(new Error("Model did not return valid JSON"), 502);
    }

    return ok(analysis, {
      facts,
      model: MODEL,
      windowDays,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
