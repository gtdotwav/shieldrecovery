import { authenticatePlatformUser, registerSellerLogin } from "@/server/auth/identities";
import { createSessionToken, isAuthConfigured, normalizeEmail } from "@/server/auth/core";
import { resolveRequestId } from "@/server/observability/request-id";
import { apiError, apiOk, corsOptions } from "@/server/recovery/utils/api-response";
import { bumpRateLimit } from "@/server/recovery/utils/distributed-rate-limit";
import { logger } from "@/server/recovery/utils/logger";

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

const RATE_WINDOW_SECONDS = 60;
const MAX_ATTEMPTS_PER_IP = 5;
const MAX_ATTEMPTS_PER_EMAIL = 8;

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
  resolveRequestId(request);
  const ip = getClientIp(request);

  const ipLimit = await bumpRateLimit({
    key: `auth-token:ip:${ip}`,
    windowSeconds: RATE_WINDOW_SECONDS,
    maxCount: MAX_ATTEMPTS_PER_IP,
  });

  if (!ipLimit.allowed) {
    logger.warn("Auth rate limit exceeded (per IP)", {
      endpoint: "/api/auth/token",
      ip,
      currentCount: ipLimit.count,
      limit: MAX_ATTEMPTS_PER_IP,
      windowSeconds: RATE_WINDOW_SECONDS,
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
    return apiError("Email and password are required.", 400, request);
  }

  const emailLimit = await bumpRateLimit({
    key: `auth-token:email:${email.toLowerCase()}`,
    windowSeconds: RATE_WINDOW_SECONDS,
    maxCount: MAX_ATTEMPTS_PER_EMAIL,
  });

  if (!emailLimit.allowed) {
    logger.warn("Auth rate limit exceeded (per email)", {
      endpoint: "/api/auth/token",
      email,
      ip,
      currentCount: emailLimit.count,
      limit: MAX_ATTEMPTS_PER_EMAIL,
    });
    return apiError("Muitas tentativas. Tente novamente em alguns segundos.", 429, request);
  }

  const identity = await authenticatePlatformUser({ email, password });

  if (!identity) {
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
