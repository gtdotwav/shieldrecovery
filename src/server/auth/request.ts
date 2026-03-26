import { NextResponse } from "next/server";

import {
  type UserRole,
  getAllowedRolesForPath,
  getSessionCookieName,
  isAuthConfigured,
  verifySessionToken,
} from "@/server/auth/core";

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

export async function ensureAuthenticatedRequest(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Platform authentication is not configured." },
      { status: 503 },
    );
  }

  const token = resolveToken(request);
  const session = await verifySessionToken(token);

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

export type ApiSession = { email: string; role: UserRole; expiresAt: number };

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

  const token = resolveToken(request);
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return session;
}
