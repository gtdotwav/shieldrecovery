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

export async function handleWhatsAppWebhook(request: Request) {
  const service = new MessagingService();
  const rawBody = await request.text();

  try {
    const result = await service.handleWhatsAppWebhook(rawBody);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error);
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
