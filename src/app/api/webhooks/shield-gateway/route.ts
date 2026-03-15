import { NextResponse } from "next/server";

import { handleShieldGatewayWebhook } from "@/server/recovery/controllers/webhook-controller";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export async function POST(request: Request) {
  return handleShieldGatewayWebhook(request);
}

export async function GET(request: Request) {
  return NextResponse.json(
    await getPaymentRecoveryService().getHealthSummary(new URL(request.url).origin),
    { status: 200 },
  );
}
