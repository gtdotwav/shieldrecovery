import { NextResponse } from "next/server";

import type { ApiSession } from "@/server/auth/request";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "*",
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
