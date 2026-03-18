import { NextRequest, NextResponse } from "next/server";
import { getCheckoutService } from "@/server/checkout";
import { handleWebhook } from "@checkout/api/handlers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerSlug: string }> },
) {
  const { providerSlug } = await params;
  const body = await request.json();
  const service = getCheckoutService();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const result = await handleWebhook(service, providerSlug, body, headers);
  return NextResponse.json(result.body, { status: result.status });
}
