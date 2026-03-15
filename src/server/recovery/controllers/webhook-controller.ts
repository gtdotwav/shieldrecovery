import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { HttpError } from "@/server/recovery/utils/http-error";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

export async function handleShieldGatewayWebhook(request: Request) {
  const rawBody = await request.text();
  const service = getPaymentRecoveryService();

  try {
    const result = await service.handleShieldGatewayWebhook({
      signature: request.headers.get("x-signature"),
      webhookId: request.headers.get("x-webhook-id"),
      timestampHeader: request.headers.get("x-timestamp"),
      rawBody,
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
