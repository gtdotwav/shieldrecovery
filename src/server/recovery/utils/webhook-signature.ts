import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpError } from "@/server/recovery/utils/http-error";

const SIGNATURE_PREFIX = "sha256=";

export function parseWebhookTimestamp(timestampHeader: string | null): number {
  if (!timestampHeader) {
    throw new HttpError(400, "Missing X-Timestamp header.");
  }

  const timestamp = Number(timestampHeader);

  if (!Number.isFinite(timestamp)) {
    throw new HttpError(400, "Invalid X-Timestamp header.");
  }

  return timestamp;
}

export function assertFreshTimestamp(
  timestamp: number,
  toleranceSeconds: number,
): void {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const age = Math.abs(nowInSeconds - timestamp);

  if (age > toleranceSeconds) {
    throw new HttpError(400, "Webhook timestamp is outside the accepted window.", {
      toleranceSeconds,
      age,
    });
  }
}

export function computeShieldGatewaySignature(input: {
  secret: string;
  timestamp: number;
  rawBody: string;
}): string {
  const payload = `${input.timestamp}.${input.rawBody}`;

  return createHmac("sha256", input.secret).update(payload).digest("hex");
}

export function verifyShieldGatewaySignature(input: {
  providedSignature: string | null;
  secret: string;
  timestamp: number;
  rawBody: string;
}): void {
  if (!input.providedSignature) {
    throw new HttpError(400, "Missing X-Signature header.");
  }

  const provided = normalizeSignature(input.providedSignature);
  const expected = computeShieldGatewaySignature({
    secret: input.secret,
    timestamp: input.timestamp,
    rawBody: input.rawBody,
  });

  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new HttpError(401, "Invalid webhook signature.");
  }
}

function normalizeSignature(signature: string): string {
  return signature.startsWith(SIGNATURE_PREFIX)
    ? signature.slice(SIGNATURE_PREFIX.length)
    : signature;
}
