import { NextRequest, NextResponse } from "next/server";
import { getCheckoutService } from "@/server/checkout";
import { handleCreateSession } from "@checkout/api/handlers";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const service = getCheckoutService();
  const result = await handleCreateSession(service, body);
  return NextResponse.json(result.body, { status: result.status });
}
