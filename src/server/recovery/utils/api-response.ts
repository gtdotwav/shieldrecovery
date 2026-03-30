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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": getCorsOrigin(),
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/** Preflight OPTIONS response with CORS headers. */
export function corsOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** JSON success response with CORS headers. */
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

/** JSON error response with CORS headers. */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}

/** Type-guard: true if the value is a NextResponse (auth failed). */
export function isErrorResponse(
  result: ApiSession | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
