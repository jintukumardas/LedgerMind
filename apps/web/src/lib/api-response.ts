import { NextResponse } from "next/server";
import { SubgraphError, meta } from "./subgraph";

/**
 * Every v1 response carries the indexed block height so an agent can tell
 * how fresh the answer is, and decide for itself whether to act on it.
 */
export async function ok<T>(data: T, extra: Record<string, unknown> = {}) {
  let source: Record<string, unknown>;
  try {
    const m = await meta();
    source = {
      indexer: "the-graph",
      network: "sei-atlantic",
      indexedBlock: m.blockNumber,
      hasIndexingErrors: m.hasIndexingErrors,
      deployment: m.deployment,
    };
  } catch {
    source = { indexer: "the-graph", network: "sei-atlantic" };
  }
  return NextResponse.json(
    { ok: true, data, source, ...extra },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function fail(err: unknown, status = 500) {
  const isSubgraph = err instanceof SubgraphError;
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    {
      ok: false,
      error: {
        type: isSubgraph ? "subgraph_unavailable" : "internal_error",
        message,
      },
    },
    { status: isSubgraph ? 503 : status },
  );
}

export function badRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: { type: "invalid_request", message } },
    { status: 400 },
  );
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
export function isAddress(v: string | null): v is string {
  return !!v && ADDRESS.test(v);
}
