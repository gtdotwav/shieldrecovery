import { timingSafeEqual } from "node:crypto";

import { logger } from "@/server/recovery/utils/logger";

const VERCEL_CRON_HEADER_VALUE = "vercel-cron/1.0";

/**
 * Authorization for cron-only endpoints (worker, agent, debug processors).
 *
 * Accepts:
 *  1. Bearer <CRON_SECRET> in Authorization header (timing-safe compare)
 *  2. Raw secret in x-worker-secret header (timing-safe compare)
 *
 * In production also logs a warning when the request lacks the Vercel Cron
 * user-agent so that suspicious manual hits show up in Sentry. We do NOT
 * gate solely on the user-agent because it is trivially spoofable; secrets
 * remain the source of truth.
 */
export function authorizeCronRequest(
  request: Request,
  context: { route: string },
): { ok: true } | { ok: false; reason: string } {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const workerSecret = process.env.WORKER_AUTH_TOKEN?.trim();

  const candidates = [cronSecret, workerSecret].filter((v): v is string => Boolean(v));
  if (candidates.length === 0) {
    return { ok: false, reason: "secret_not_configured" };
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const headerToken = request.headers.get("x-worker-secret")?.trim() ?? "";

  const matches = candidates.some(
    (secret) =>
      (bearer && safeCompare(secret, bearer)) ||
      (headerToken && safeCompare(secret, headerToken)),
  );

  if (!matches) {
    return { ok: false, reason: "invalid_secret" };
  }

  // Defensive logging: production runs without the Vercel cron UA most likely
  // mean a manual hit. Not blocked, but surfaced for review.
  if (process.env.NODE_ENV === "production") {
    const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent.includes(VERCEL_CRON_HEADER_VALUE)) {
      logger.warn("Cron endpoint hit without Vercel cron user-agent", {
        route: context.route,
        userAgent,
        viaBearer: Boolean(bearer),
      });
    }
  }

  return { ok: true };
}

function safeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
