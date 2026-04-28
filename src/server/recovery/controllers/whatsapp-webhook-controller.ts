import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { HttpError } from "@/server/recovery/utils/http-error";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

export async function handleWhatsAppWebhookVerification(request: Request) {
  const service = new MessagingService();

  try {
    const challenge = await service.verifyWhatsAppWebhook(
      new URL(request.url).searchParams,
    );

    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    return buildErrorResponse(error);
  }
}

function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = (
    process.env.WHATSAPP_APP_SECRET ??
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ??
    ""
  ).trim();

  if (!appSecret) {
    console.error("[WhatsApp] Webhook signature verification failed — no secret configured (WHATSAPP_APP_SECRET or WHATSAPP_WEBHOOK_VERIFY_TOKEN)");
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const providedSignature = signatureHeader.replace("sha256=", "");

  if (expectedSignature.length !== providedSignature.length) {
    return false;
  }

  // Constant-time comparison
  const bufExpected = Buffer.from(expectedSignature, "hex");
  const bufProvided = Buffer.from(providedSignature, "hex");
  if (bufExpected.length !== bufProvided.length) return false;

  return timingSafeEqual(bufExpected, bufProvided);
}

export async function handleWhatsAppWebhook(request: Request) {
  const service = new MessagingService();
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read request body." },
      { status: 400 },
    );
  }

  const payload = safeParseWebhookPayload(rawBody);
  const isMetaWebhook =
    Boolean(payload) &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    (payload as Record<string, unknown>).object === "whatsapp_business_account";

  const signature = request.headers.get("x-hub-signature-256");
  if (isMetaWebhook && !verifyWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature." },
      { status: 401 },
    );
  }

  try {
    const result = await service.handleWhatsAppWebhook(rawBody);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error);
  }
}

function safeParseWebhookPayload(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
}

async function buildErrorResponse(error: unknown) {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message =
    error instanceof Error ? error.message : "Unexpected WhatsApp webhook failure.";

  await getStorageService().addLog(
    createStructuredLog({
      eventType:
        error instanceof HttpError ? "webhook_rejected" : "processing_error",
      level: statusCode >= 500 ? "error" : "warn",
      message,
      context: {
        statusCode,
        source: "whatsapp",
      },
    }),
  ).catch(() => {});

  return NextResponse.json(
    {
      ok: false,
      error: message,
      details: error instanceof HttpError ? error.details ?? null : null,
    },
    { status: statusCode },
  );
}
