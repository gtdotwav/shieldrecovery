import { logger } from "@/server/recovery/utils/logger";

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * fetch wrapper that always carries an AbortSignal timeout, even when the
 * caller forgets to pass one. Centralising this prevents a stuck remote
 * (OpenAI, WhatsApp Cloud, SendGrid, VAPI, PagouAi…) from holding our cron
 * function open until the Vercel hard timeout kills the whole tick.
 *
 * Behaviour:
 *  - Honours an existing init.signal (we don't override caller intent).
 *  - Otherwise installs AbortSignal.timeout(timeoutMs).
 *  - Tags AbortError with our own marker so logger.error can downgrade it
 *    to "warning" in Sentry without losing the trail.
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init ?? {};
  const signal = rest.signal ?? AbortSignal.timeout(timeoutMs);

  try {
    return await fetch(input, { ...rest, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      logger.warn("safeFetch aborted by timeout", {
        url: typeof input === "string" ? input : input.toString(),
        timeoutMs,
      });
    }
    throw error;
  }
}
