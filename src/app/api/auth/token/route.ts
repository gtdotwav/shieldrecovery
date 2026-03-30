import { authenticatePlatformUser, registerSellerLogin } from "@/server/auth/identities";
import { createSessionToken, isAuthConfigured } from "@/server/auth/core";
import { apiError, apiOk, corsOptions } from "@/server/recovery/utils/api-response";

export function OPTIONS() {
  return corsOptions();
}

/* ── Simple in-memory rate limiter ── */

const RATE_WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_ATTEMPTS;
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
    return apiError("Muitas tentativas. Tente novamente em 1 minuto.", 429);
  }

  if (!isAuthConfigured()) {
    return apiError("Platform authentication is not configured.", 503);
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";

  if (!email || !password) {
    return apiError("Email and password are required.", 400);
  }

  const identity = await authenticatePlatformUser({ email, password });

  if (!identity) {
    return apiError("Invalid credentials.", 401);
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
  });
}
