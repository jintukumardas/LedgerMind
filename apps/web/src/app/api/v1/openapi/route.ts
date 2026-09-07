import { NextRequest, NextResponse } from "next/server";
import { spec } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json(spec(origin), {
    headers: { "Cache-Control": "no-store" },
  });
}
