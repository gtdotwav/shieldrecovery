import { NextRequest, NextResponse } from "next/server";
import { getCheckoutService } from "@/server/checkout";
import { handleGetAnalytics } from "@checkout/api/handlers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;

  const service = getCheckoutService();
  const result = await handleGetAnalytics(service, fromDate, toDate);
  return NextResponse.json(result.body, { status: result.status });
}
