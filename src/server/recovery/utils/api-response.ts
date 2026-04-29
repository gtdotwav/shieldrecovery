import { NextResponse } from "next/server";

import type { ApiSession } from "@/server/auth/request";

let cachedPrimaryOrigin: string | null = null;
let warnedDevFallback = false;

/**
 * Resolve the canonical app origin lazily. We can't fail at module load time
 * because Next.js evaluates server modules during the build (page data
 * collection) without runtime env vars set. Throwing there would block the
 * build entirely.
 *
 * In production runtime: missing NEXT_PUBLIC_APP_URL is fatal — we refuse
 * to silently fall back to a hardcoded value.
 * In dev: we use http://localhost:3000 with a one-shot warning.
 */
function getPrimaryOrigin(): string {
  if (cachedPrimaryOrigin) return cachedPrimaryOrigin;
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) {
    cachedPrimaryOrigin = url;
    return url;
  }
  // We are in production runtime (request-scoped) without the env var set.
  // Refuse the request rather than echo a permissive Origin header.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_RUNTIME) {
    throw new Error(
      "[CORS] NEXT_PUBLIC_APP_URL is required in production. " +
        "Set it to the canonical app URL (e.g. https://pagrecovery.com) before serving traffic.",
    );
  }
  if (!warnedDevFallback) {
    console.warn(
      "[CORS] NEXT_PUBLIC_APP_URL not set — defaulting to http://localhost:3000 for dev",
    );
    warnedDevFallback = true;
  }
  cachedPrimaryOrigin = "http://localhost:3000";
  return cachedPrimaryOrigin;
}

function getAllowedOrigins(): Set<string> {
  const set = new Set<string>([getPrimaryOrigin()]);
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:8081");
    set.add("http://localhost:19006");
    set.add("http://localhost:3000");
  }
  return set;
}

function corsHeaders(origin?: string | null): Record<string, string> {
  const primary = getPrimaryOrigin();
  const allowed = origin && getAllowedOrigins().has(origin) ? origin : primary;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Preflight OPTIONS response with CORS headers. */
export function corsOptions(request?: Request) {
  const origin = request?.headers?.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

/** JSON success response with CORS headers. */
export function apiOk<T>(data: T, status = 200, request?: Request) {
  const origin = request?.headers?.get("origin");
  return NextResponse.json(data, { status, headers: corsHeaders(origin) });
}

/** JSON error response with CORS headers and standardized format. */
export function apiError(message: string, status = 400, request?: Request, code?: string) {
  const origin = request?.headers?.get("origin");
  const errorCode = code ?? deriveErrorCode(status);
  return NextResponse.json(
    { error: { code: errorCode, message } },
    { status, headers: corsHeaders(origin) },
  );
}

function deriveErrorCode(status: number): string {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  if (status >= 500) return "INTERNAL_ERROR";
  return "ERROR";
}

/** Type-guard: true if the value is a NextResponse (auth failed). */
export function isErrorResponse(
  result: ApiSession | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
