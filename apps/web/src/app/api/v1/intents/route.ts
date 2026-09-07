import { NextRequest } from "next/server";
import { listIntents } from "@/lib/subgraph";
import { badRequest, fail, isAddress, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const STATES = ["Active", "Revoked", "Expired"];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const payer = sp.get("payer");
  const agent = sp.get("agent");
  const state = sp.get("state");

  if (payer && !isAddress(payer)) return badRequest("payer must be a 0x address");
  if (agent && !isAddress(agent)) return badRequest("agent must be a 0x address");
  if (state && !STATES.includes(state)) {
    return badRequest(`state must be one of ${STATES.join(", ")}`);
  }

  const first = Number(sp.get("limit") ?? 50);
  const skip = Number(sp.get("offset") ?? 0);
  if (!Number.isFinite(first) || first < 1) return badRequest("limit must be >= 1");
  if (!Number.isFinite(skip) || skip < 0) return badRequest("offset must be >= 0");

  try {
    const intents = await listIntents({
      payer: payer ?? undefined,
      agent: agent ?? undefined,
      state: state ?? undefined,
      first,
      skip,
    });
    return ok(intents, { count: intents.length });
  } catch (err) {
    return fail(err);
  }
}
