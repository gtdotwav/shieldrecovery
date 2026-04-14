import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCartAbandonmentService } from "@/server/recovery/services/cart-abandonment-service";
import type { IngestCartAbandonmentInput } from "@/server/recovery/services/cart-abandonment-service";

export const maxDuration = 30;

/**
 * POST /api/webhooks/cart-abandonment
 * Receives cart abandonment events from external platforms.
 * No auth — uses webhook signature verification.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  let body: IngestCartAbandonmentInput;
  try {
    body = await request.json() as IngestCartAbandonmentInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getCartAbandonmentService();

  try {
    await service.ingestCartAbandonment(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
