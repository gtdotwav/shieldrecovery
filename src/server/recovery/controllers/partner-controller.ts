import { NextResponse } from "next/server";

import { verifyApiKey, isApiKeyFormat } from "@/server/auth/api-keys";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { HttpError } from "@/server/recovery/utils/http-error";
import { logger } from "@/server/recovery/utils/logger";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;

  return parts[1];
}

export async function handlePartnerIngest(request: Request) {
  // ── Auth ──
  const token = extractBearerToken(request);

  if (!token || !isApiKeyFormat(token)) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid API key. Use Authorization: Bearer sk_live_...",
        },
      },
      { status: 401 },
    );
  }

  const session = await verifyApiKey(token);

  if (!session) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired API key.",
        },
      },
      { status: 401 },
    );
  }

  // ── Scope check ──
  if (session.scopes.length > 0 && !session.scopes.includes("partner:ingest")) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "API key does not have the 'partner:ingest' scope.",
        },
      },
      { status: 403 },
    );
  }

  // ── Payload size ──
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large (max 1MB)." } },
      { status: 413 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Failed to read request body." } },
      { status: 400 },
    );
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large (max 1MB)." } },
      { status: 413 },
    );
  }

  // ── Process ──
  const service = getPaymentRecoveryService();
  const sellerKey = session.sellerKey ?? undefined;

  try {
    const result = await service.handlePartnerIngestWebhook({
      rawBody,
      sellerKey,
      apiKeyId: session.apiKeyId,
      partnerEmail: session.email,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const internalMessage =
      error instanceof Error ? error.message : "Unexpected partner ingest failure.";

    logger.error("Partner ingest failed", {
      handler: "handlePartnerIngest",
      statusCode,
      sellerKey: sellerKey ?? null,
      apiKeyId: session.apiKeyId,
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
            sellerKey: sellerKey ?? null,
            provider: "partner",
            apiKeyId: session.apiKeyId,
          },
        }),
      )
      .catch((err) => console.error("[partner-controller] log error:", err));

    return NextResponse.json(
      {
        error: {
          code: statusCode >= 500 ? "PROCESSING_ERROR" : "REJECTED",
          message:
            statusCode >= 500
              ? "Internal processing error."
              : internalMessage,
        },
      },
      { status: statusCode },
    );
  }
}

export async function handlePartnerIngestHealth(request: Request) {
  try {
    const service = getPaymentRecoveryService();
    const origin = new URL(request.url).origin;
    const gateway = (await service.getHealthSummary(origin)).service;

    return NextResponse.json(
      {
        ok: true,
        service: "partner-ingest",
        gateway,
        docs: {
          method: "POST",
          path: "/api/partner/ingest",
          auth: "Authorization: Bearer sk_live_...",
          body: {
            event_type: "payment_failed | payment_refused | payment_expired | ...",
            payment: {
              id: "gateway-payment-id",
              order_id: "order-123",
              amount: 9990,
              currency: "BRL",
              method: "pix | credit_card | boleto",
              status: "failed | refused | expired",
            },
            customer: {
              name: "Customer Name",
              email: "customer@email.com",
              phone: "5511999999999",
              document: "12345678900",
            },
            metadata: {
              product: "Product name (optional)",
              campaign: "Campaign ID (optional)",
              paymentUrl: "Retry payment URL (optional)",
              pixCode: "PIX copia-e-cola (optional)",
            },
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Partner ingest health check failed", {
      handler: "handlePartnerIngestHealth",
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: { code: "HEALTH_CHECK_FAILED", message: "Health check failed." } },
      { status: 500 },
    );
  }
}
