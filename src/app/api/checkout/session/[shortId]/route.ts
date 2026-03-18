import { NextRequest, NextResponse } from "next/server";
import { getCheckoutService } from "@/server/checkout";
import { handleGetSession } from "@checkout/api/handlers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const { shortId } = await params;
  const service = getCheckoutService();
  const result = await handleGetSession(service, shortId);
  return NextResponse.json(result.body, { status: result.status });
}
