import { NextResponse } from "next/server";

import { createApiKey, listApiKeys } from "@/server/auth/api-keys";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

/** List API keys (admin only). Sensitive fields (hash) are never exposed. */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const keys = await listApiKeys();
    return apiOk({ keys }, 200, request);
  } catch (err) {
    console.error("[keys GET]", err);
    return apiError("Internal error", 500, request);
  }
}

/** Create a new API key (admin only). The raw key is returned ONCE. */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  let body: {
    name?: string;
    role?: string;
    sellerKey?: string;
    scopes?: string[];
    rateLimitPerMinute?: number;
    expiresAt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400, request);
  }

  const name = body.name?.trim();
  if (!name) {
    return apiError("Name is required.", 400, request);
  }

  const role = body.role === "admin" ? "admin" : "seller";

  try {
    const { record, rawKey } = await createApiKey({
      name,
      role,
      sellerKey: body.sellerKey,
      scopes: body.scopes,
      rateLimitPerMinute: body.rateLimitPerMinute,
      expiresAt: body.expiresAt,
      createdByEmail: auth.email,
    });

    return apiOk(
      {
        key: rawKey,
        id: record.id,
        name: record.name,
        prefix: record.keyPrefix,
        role: record.role,
        sellerKey: record.sellerKey,
        scopes: record.scopes,
        rateLimitPerMinute: record.rateLimitPerMinute,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
        warning: "Store this key securely. It will not be shown again.",
      },
      201,
      request,
    );
  } catch (err) {
    console.error("[keys POST]", err);
    return apiError("Internal error", 500, request);
  }
}
