import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { createEmbedToken } from "@/server/auth/embed-tokens";
import { getStorageService } from "@/server/recovery/services/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requirePartnerApiKey(request);
  if (isErrorResponse(auth)) return auth;

  let body: { sellerKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const sellerKey = body.sellerKey?.trim();
  if (!sellerKey) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "sellerKey is required." } },
      { status: 400 },
    );
  }

  // Scope check
  if (auth.sellerKey && auth.sellerKey !== sellerKey) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API key not scoped to this seller." } },
      { status: 403 },
    );
  }

  // Verify seller exists
  const controls = await getStorageService().getSellerAdminControls();
  const exists = controls.some((c) => c.sellerKey === sellerKey);
  if (!exists) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Seller not found." } },
      { status: 404 },
    );
  }

  const token = await createEmbedToken(sellerKey, auth.apiKeyId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pagrecovery.com";

  return NextResponse.json({
    token,
    url: `${baseUrl}/embed/recovery?t=${token}`,
    expires_in: 3600,
  });
}
