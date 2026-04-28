import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { getSellerWhatsAppService } from "@/server/recovery/services/seller-whatsapp-service";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ sellerKey: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  const auth = await requirePartnerApiKey(request);
  if (isErrorResponse(auth)) return auth;

  const { sellerKey } = await params;

  if (auth.sellerKey && auth.sellerKey !== sellerKey) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API key not scoped to this seller." } },
      { status: 403 },
    );
  }

  try {
    const snapshot = await getSellerWhatsAppService().disconnect(sellerKey);

    return NextResponse.json({
      ok: true,
      instance: snapshot.instanceName,
      status: snapshot.status,
      message: "WhatsApp disconnected successfully.",
    });
  } catch (error) {
    const status = error instanceof Error && "statusCode" in error ? (error as { statusCode: number }).statusCode : 500;
    const message = error instanceof Error ? error.message : "Failed to disconnect WhatsApp.";

    return NextResponse.json(
      { error: { code: "DISCONNECT_FAILED", message } },
      { status },
    );
  }
}
