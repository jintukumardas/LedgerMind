import { NextRequest } from "next/server";
import { listPayments } from "@/lib/subgraph";
import { badRequest, fail, isAddress, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const intent = sp.get("intent");
  const agent = sp.get("agent");
  const merchant = sp.get("merchant");
  const sinceRaw = sp.get("since");

  if (intent && !isAddress(intent)) return badRequest("intent must be a 0x address");
  if (agent && !isAddress(agent)) return badRequest("agent must be a 0x address");
  if (merchant && !isAddress(merchant)) {
    return badRequest("merchant must be a 0x address");
  }

  let since: number | undefined;
  if (sinceRaw) {
    since = Number(sinceRaw);
    if (!Number.isFinite(since) || since < 0) {
      return badRequest("since must be a unix timestamp in seconds");
    }
  }

  const first = Number(sp.get("limit") ?? 100);
  if (!Number.isFinite(first) || first < 1) return badRequest("limit must be >= 1");

  try {
    const payments = await listPayments({
      intent: intent ?? undefined,
      agent: agent ?? undefined,
      merchant: merchant ?? undefined,
      since,
      first,
    });
    const total = payments.reduce((a, p) => a + BigInt(p.amount), 0n);
    return ok(payments, {
      count: payments.length,
      totalAmount: total.toString(),
    });
  } catch (err) {
    return fail(err);
  }
}
