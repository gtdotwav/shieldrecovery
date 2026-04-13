import { NextResponse } from "next/server";

import type { ApiSession } from "@/server/auth/request";

function getCorsOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!url) {
    console.warn("[CORS] NEXT_PUBLIC_APP_URL not set — defaulting to restricted origin");
    return "https://pagrecovery.com.br";
  }
  return url;
}

const ALLOWED_ORIGINS = new Set([
  getCorsOrigin(),
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:8081", "http://localhost:19006"]
    : []),
]);

function corsHeaders(origin?: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : getCorsOrigin();
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

const CORS_HEADERS = corsHeaders();

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
  const errorCode = code ?? deriveErrorCode(status, message);
  return NextResponse.json(
    { error: { code: errorCode, message } },
    { status, headers: corsHeaders(origin) },
  );
}

function deriveErrorCode(status: number, message: string): string {
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
