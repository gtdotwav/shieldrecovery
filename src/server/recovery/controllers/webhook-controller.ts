import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { HttpError } from "@/server/recovery/utils/http-error";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

export async function handleShieldGatewayWebhook(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read request body." },
      { status: 400 },
    );
  }
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
    const internalMessage =
      error instanceof Error ? error.message : "Unexpected webhook failure.";

    console.error("[handleShieldGatewayWebhook]", internalMessage, error instanceof HttpError ? error.details : undefined);

    await getStorageService().addLog(
      createStructuredLog({
        eventType:
          error instanceof HttpError ? "webhook_rejected" : "processing_error",
        level: statusCode >= 500 ? "error" : "warn",
        message: internalMessage,
        context: {
          statusCode,
          sellerKey: options?.sellerKey ?? null,
        },
      }),
    ).catch(() => {});

    return NextResponse.json(
      {
        ok: false,
        error: statusCode >= 500 ? "Internal webhook processing error." : internalMessage,
      },
      { status: statusCode },
    );
  }
}

export async function handleShieldGatewayHealth(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  try {
    const service = getPaymentRecoveryService();
    const sellerKey = options?.sellerKey ?? null;
    const origin = new URL(request.url).origin;
    const gateway = (await service.getHealthSummary(origin)).service;

    return NextResponse.json(
      {
        ok: true,
        gateway,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[handleHealthCheck]", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Health check failed." }, { status: 500 });
  }
}

export async function handlePagouAiWebhook(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read request body." },
      { status: 400 },
    );
  }

  const service = getPaymentRecoveryService();

  try {
    const result = await service.handlePagouAiWebhook({
      rawBody,
      sellerKey: options?.sellerKey,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const internalMessage =
      error instanceof Error ? error.message : "Unexpected Pagou.ai webhook failure.";

    console.error("[handlePagouAiWebhook]", internalMessage);

    await getStorageService()
      .addLog(
        createStructuredLog({
          eventType:
            error instanceof HttpError ? "webhook_rejected" : "processing_error",
          level: statusCode >= 500 ? "error" : "warn",
          message: internalMessage,
          context: {
            statusCode,
            sellerKey: options?.sellerKey ?? null,
            provider: "pagouai",
          },
        }),
      )
      .catch(() => {});

    return NextResponse.json(
      {
        ok: false,
        error: statusCode >= 500 ? "Internal webhook processing error." : internalMessage,
      },
      { status: statusCode },
    );
  }
}

export async function handlePagouAiHealth(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  return handleShieldGatewayHealth(request, options);
}

export async function handlePagNetWebhook(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  return handlePagouAiWebhook(request, options);
}

export async function handlePagNetHealth(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  return handleShieldGatewayHealth(request, options);
}

export async function handleBuckPayWebhook(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read request body." },
      { status: 400 },
    );
  }

  const service = getPaymentRecoveryService();

  try {
    const result = await service.handleBuckPayWebhook({
      rawBody,
      sellerKey: options?.sellerKey,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const internalMessage =
      error instanceof Error ? error.message : "Unexpected BuckPay webhook failure.";

    console.error("[handleBuckPayWebhook]", internalMessage);

    await getStorageService()
      .addLog(
        createStructuredLog({
          eventType:
            error instanceof HttpError ? "webhook_rejected" : "processing_error",
          level: statusCode >= 500 ? "error" : "warn",
          message: internalMessage,
          context: {
            statusCode,
            sellerKey: options?.sellerKey ?? null,
            provider: "buckpay",
          },
        }),
      )
      .catch(() => {});

    return NextResponse.json(
      {
        ok: false,
        error: statusCode >= 500 ? "Internal webhook processing error." : internalMessage,
      },
      { status: statusCode },
    );
  }
}

export async function handleBuckPayHealth(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  return handleShieldGatewayHealth(request, options);
}
