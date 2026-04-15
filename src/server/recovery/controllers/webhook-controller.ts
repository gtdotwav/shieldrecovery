import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { HttpError } from "@/server/recovery/utils/http-error";
import { logger } from "@/server/recovery/utils/logger";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB

function checkPayloadSize(request: Request): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" } },
      { status: 413 },
    );
  }
  return null;
}

function checkRawBodySize(rawBody: string): NextResponse | null {
  if (new TextEncoder().encode(rawBody).byteLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" } },
      { status: 413 },
    );
  }
  return null;
}

export async function handleShieldGatewayWebhook(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  const sizeCheck = checkPayloadSize(request);
  if (sizeCheck) return sizeCheck;

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Failed to read request body." } },
      { status: 400 },
    );
  }

  const bodySizeCheck = checkRawBodySize(rawBody);
  if (bodySizeCheck) return bodySizeCheck;
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

    logger.error("Shield Gateway webhook failed", {
      handler: "handleShieldGatewayWebhook",
      statusCode,
      sellerKey: options?.sellerKey ?? null,
      details: error instanceof HttpError ? error.details : undefined,
      message: internalMessage,
    });

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
    ).catch((err) => console.error("[webhook-controller] log error:", err));

    return NextResponse.json(
      {
        error: {
          code: statusCode >= 500 ? "WEBHOOK_PROCESSING_ERROR" : "WEBHOOK_REJECTED",
          message: statusCode >= 500 ? "Internal webhook processing error." : internalMessage,
        },
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
    logger.error("Health check failed", {
      handler: "handleHealthCheck",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "HEALTH_CHECK_FAILED", message: "Health check failed." } },
      { status: 500 },
    );
  }
}

export async function handlePagouAiWebhook(
  request: Request,
  options?: { sellerKey?: string | null },
) {
  const sizeCheck = checkPayloadSize(request);
  if (sizeCheck) return sizeCheck;

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Failed to read request body." } },
      { status: 400 },
    );
  }

  const bodySizeCheck = checkRawBodySize(rawBody);
  if (bodySizeCheck) return bodySizeCheck;

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

    logger.error("PagouAi webhook failed", {
      handler: "handlePagouAiWebhook",
      statusCode,
      sellerKey: options?.sellerKey ?? null,
      message: internalMessage,
    });

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
      .catch((err) => console.error("[webhook-controller] log error:", err));

    return NextResponse.json(
      {
        error: {
          code: statusCode >= 500 ? "WEBHOOK_PROCESSING_ERROR" : "WEBHOOK_REJECTED",
          message: statusCode >= 500 ? "Internal webhook processing error." : internalMessage,
        },
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
  const sizeCheck = checkPayloadSize(request);
  if (sizeCheck) return sizeCheck;

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Failed to read request body." } },
      { status: 400 },
    );
  }

  const bodySizeCheck = checkRawBodySize(rawBody);
  if (bodySizeCheck) return bodySizeCheck;

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

    logger.error("BuckPay webhook failed", {
      handler: "handleBuckPayWebhook",
      statusCode,
      sellerKey: options?.sellerKey ?? null,
      message: internalMessage,
    });

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
      .catch((err) => console.error("[webhook-controller] log error:", err));

    return NextResponse.json(
      {
        error: {
          code: statusCode >= 500 ? "WEBHOOK_PROCESSING_ERROR" : "WEBHOOK_REJECTED",
          message: statusCode >= 500 ? "Internal webhook processing error." : internalMessage,
        },
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
