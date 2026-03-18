import { NextRequest, NextResponse } from "next/server";
import { getCheckoutService } from "@/server/checkout";
import { handleTrackEvent } from "@checkout/api/handlers";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const service = getCheckoutService();
  const result = await handleTrackEvent(service, body);

  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(result.body, { status: result.status });
}
