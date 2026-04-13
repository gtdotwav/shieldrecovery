import { authenticatePlatformUser, registerSellerLogin } from "@/server/auth/identities";
import { createSessionToken, isAuthConfigured, normalizeEmail } from "@/server/auth/core";
import { apiError, apiOk, corsOptions } from "@/server/recovery/utils/api-response";
import { logger } from "@/server/recovery/utils/logger";

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

/* ── Simple in-memory rate limiter ──
 * NOTE: This Map resets on Vercel cold starts, so it only provides
 * per-isolate protection. A persistent store (Redis / KV) would be
 * needed for cross-isolate rate limiting. The shorter window (30s)
 * makes the per-isolate limiter more effective against burst attacks.
 */

const RATE_WINDOW_MS = 30_000; // 30 seconds — shorter window is more effective per-isolate
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

function recordAttempt(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    entry.count++;
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

// Periodically clean up stale entries (every 5 min)
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 300_000;
  const key = "__auth_rate_limit_cleanup";
  if (!(globalThis as Record<string, unknown>)[key]) {
    (globalThis as Record<string, unknown>)[key] = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of attempts) {
        if (now > entry.resetAt) attempts.delete(ip);
      }
    }, CLEANUP_INTERVAL);
  }
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * POST /api/auth/token
 * Body: { email: string; password: string }
 * Returns: { token: string; role: string; email: string; expiresIn: number }
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    const entry = attempts.get(ip);
    logger.warn("Auth rate limit exceeded", {
      endpoint: "/api/auth/token",
      ip,
      currentCount: entry?.count ?? 0,
      limit: MAX_ATTEMPTS,
      windowMs: RATE_WINDOW_MS,
    });
    return apiError("Muitas tentativas. Tente novamente em alguns segundos.", 429, request);
  }

  if (!isAuthConfigured()) {
    return apiError("Platform authentication is not configured.", 503, request);
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400, request);
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password?.trim() ?? "";

  if (!email || !password) {
    recordAttempt(ip);
    return apiError("Email and password are required.", 400, request);
  }

  const identity = await authenticatePlatformUser({ email, password });

  if (!identity) {
    recordAttempt(ip);
    return apiError("Invalid credentials.", 401, request);
  }

  if (identity.role === "seller") {
    await registerSellerLogin(identity.email);
  }

  const token = await createSessionToken(identity.email, identity.role);

  return apiOk({
    token,
    role: identity.role,
    email: identity.email,
    expiresIn: 60 * 60 * 24 * 7,
    expiresAt: Date.now() + 60 * 60 * 24 * 7 * 1000,
  }, 200, request);
}
