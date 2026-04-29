import { randomUUID } from "node:crypto";

import { setRequestId } from "@/server/observability/sentry";

/**
 * Resolves a stable request id for the current request:
 *  - reuses x-vercel-id (Vercel) if present,
 *  - otherwise reuses an inbound x-request-id,
 *  - otherwise generates a new UUID.
 *
 * Side effect: tags the current Sentry scope with the resolved id.
 *
 * Use at the start of every API route handler / cron job so every log line,
 * Sentry event and downstream fetch can be correlated end-to-end.
 */
export function resolveRequestId(request: Request): string {
  const fromHeader =
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    request.headers.get("cf-ray");

  const id = (fromHeader && fromHeader.trim()) || randomUUID();
  setRequestId(id);
  return id;
}

/**
 * Convenience header bag for outbound fetch calls so external services see the
 * same id we emit in our logs.
 */
export function withRequestIdHeader(
  requestId: string,
  init?: HeadersInit,
): Headers {
  const headers = new Headers(init);
  headers.set("x-request-id", requestId);
  return headers;
}
