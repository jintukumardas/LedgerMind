import { NextRequest, NextResponse } from "next/server";
import { getIntent, listPayments } from "@/lib/subgraph";
import { badRequest, fail, isAddress, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  const address = params.address;
  if (!isAddress(address)) return badRequest("address must be a 0x address");

  try {
    const intent = await getIntent(address);
    if (!intent) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            type: "not_found",
            message:
              "No intent at that address in the indexed range. The subgraph " +
              "indexes from the ETHOnline 2026 start block; older intents " +
              "are not included.",
          },
        },
        { status: 404 },
      );
    }
    const payments = await listPayments({ intent: address, first: 200 });
    return ok({ ...intent, payments });
  } catch (err) {
    return fail(err);
  }
}
