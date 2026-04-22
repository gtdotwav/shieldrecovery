import { NextResponse } from "next/server";

import { verifyApiKey, isApiKeyFormat, type ApiKeySession } from "@/server/auth/api-keys";

/**
 * Validates partner API key from Authorization header.
 * Returns session on success, NextResponse error on failure.
 */
export async function requirePartnerApiKey(
  request: Request,
): Promise<ApiKeySession | NextResponse> {
  const header = request.headers.get("authorization");
  if (!header) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing Authorization header." } },
      { status: 401 },
    );
  }

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Use Authorization: Bearer sk_live_..." } },
      { status: 401 },
    );
  }

  const token = parts[1];
  if (!isApiKeyFormat(token)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API key format." } },
      { status: 401 },
    );
  }

  const session = await verifyApiKey(token);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or expired API key." } },
      { status: 401 },
    );
  }

  return session;
}

export function isErrorResponse(
  result: ApiKeySession | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
