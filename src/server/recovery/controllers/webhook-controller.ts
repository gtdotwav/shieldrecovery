import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { HttpError } from "@/server/recovery/utils/http-error";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

export async function handleShieldGatewayWebhook(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  const rawBody = await request.text();
  const service = getPaymentRecoveryService();

  try {
    const result = await service.handleShieldGatewayWebhook({
      signature: request.headers.get("x-signature"),
      webhookId: request.headers.get("x-webhook-id"),
      timestampHeader: request.headers.get("x-timestamp"),
      rawBody,
      sellerKey: options?.sellerKey,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message =
      error instanceof Error ? error.message : "Unexpected webhook failure.";

    await getStorageService().addLog(
      createStructuredLog({
        eventType:
          error instanceof HttpError ? "webhook_rejected" : "processing_error",
        level: statusCode >= 500 ? "error" : "warn",
        message,
        context: {
          statusCode,
          sellerKey: options?.sellerKey ?? null,
        },
      }),
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
        details: error instanceof HttpError ? error.details ?? null : null,
      },
      { status: statusCode },
    );
  }
}

export async function handleShieldGatewayHealth(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  const service = getPaymentRecoveryService();
  const sellerKey = options?.sellerKey ?? null;
  const origin = new URL(request.url).origin;

  return NextResponse.json(
    {
      ...(await service.getHealthSummary(origin)),
      webhook_url: sellerKey
        ? await service.getGatewayWebhookUrlForSeller(sellerKey)
        : `${origin}/api/webhooks/shield-gateway`,
      seller_key: sellerKey,
    },
    { status: 200 },
  );
}
