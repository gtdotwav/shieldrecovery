import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { getSellerWhatsAppService } from "@/server/recovery/services/seller-whatsapp-service";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ sellerKey: string }> };

export async function GET(request: Request, { params }: RouteProps) {
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
    const snapshot = await getSellerWhatsAppService().refresh(sellerKey);

    return NextResponse.json({
      ok: true,
      instance: snapshot.instanceName,
      status: snapshot.status,
      qr_code: snapshot.status === "pending_qr" ? (snapshot.qrCode || null) : null,
      connected_phone: snapshot.connectedPhone || null,
      error: snapshot.error || null,
      updated_at: snapshot.updatedAt || null,
    });
  } catch (error) {
    const status = error instanceof Error && "statusCode" in error ? (error as { statusCode: number }).statusCode : 500;
    const message = error instanceof Error ? error.message : "Failed to check WhatsApp status.";

    return NextResponse.json(
      { error: { code: "STATUS_CHECK_FAILED", message } },
      { status },
    );
  }
}
