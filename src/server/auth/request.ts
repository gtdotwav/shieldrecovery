import { NextResponse } from "next/server";

import {
  type UserRole,
  getAllowedRolesForPath,
  getSessionCookieName,
  isAuthConfigured,
  verifySessionToken,
} from "@/server/auth/core";
import {
  type ApiKeySession,
  checkApiKeyRateLimit,
  isApiKeyFormat,
  verifyApiKey,
} from "@/server/auth/api-keys";

function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const target = cookies.find((part) => part.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.slice(name.length + 1)) : null;
}

/** Extract Bearer token from Authorization header. */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

/** Resolve the session token from Bearer header (priority) or cookie. */
export function resolveToken(request: Request): string | null {
  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (bearer) return bearer;
  return readCookieValue(request.headers.get("cookie"), getSessionCookieName());
}

export type ApiSession = {
  email: string;
  role: UserRole;
  expiresAt: number;
  apiKeyId?: string;
  sellerKey?: string | null;
};

/**
 * Resolve authentication from either a session token or an API key.
 * API keys (sk_live_*, sk_test_*) are verified against the database.
 * Session tokens are verified via HMAC signature.
 */
async function resolveAuth(request: Request): Promise<ApiSession | null> {
  const token = resolveToken(request);
  if (!token) return null;

  // API key path
  if (isApiKeyFormat(token)) {
    const keySession = await verifyApiKey(token);
    if (!keySession) return null;
    return {
      email: keySession.email,
      role: keySession.role,
      expiresAt: keySession.expiresAt,
      apiKeyId: keySession.apiKeyId,
      sellerKey: keySession.sellerKey,
    };
  }

  // Session token path
  const session = await verifySessionToken(token);
  if (!session) return null;
  return session;
}

export async function ensureAuthenticatedRequest(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Platform authentication is not configured." },
      { status: 503 },
    );
  }

  // Check API key rate limit before full verification
  const token = resolveToken(request);
  if (token && isApiKeyFormat(token)) {
    const limited = await checkApiKeyRateLimit(token);
    if (limited) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "API key rate limit exceeded." } },
        { status: 429 },
      );
    }
  }

  const session = await resolveAuth(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const pathname = new URL(request.url).pathname;
  const allowedRoles = getAllowedRolesForPath(pathname);

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}

/**
 * Require authentication for API route handlers.
 * Returns the session or throws a NextResponse (use in try/catch or early return).
 */
export async function requireApiAuth(
  request: Request,
  allowedRoles?: UserRole[],
): Promise<ApiSession | NextResponse> {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Platform authentication is not configured." },
      { status: 503 },
    );
  }

  // Check API key rate limit before full verification
  const token = resolveToken(request);
  if (token && isApiKeyFormat(token)) {
    const limited = await checkApiKeyRateLimit(token);
    if (limited) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "API key rate limit exceeded." } },
        { status: 429 },
      );
    }
  }

  const session = await resolveAuth(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return session;
}
