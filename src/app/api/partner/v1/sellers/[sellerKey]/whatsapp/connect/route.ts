import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { getSellerWhatsAppService } from "@/server/recovery/services/seller-whatsapp-service";
import { checkRateLimit, partnerApiLimiter } from "@/server/recovery/utils/rate-limiter";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ sellerKey: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  const rateLimited = checkRateLimit(request, partnerApiLimiter);
  if (rateLimited) return rateLimited;

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
    const snapshot = await getSellerWhatsAppService().connect(sellerKey);

    return NextResponse.json({
      ok: true,
      instance: snapshot.instanceName,
      status: snapshot.status,
      qr_code: snapshot.qrCode || null,
      connected_phone: snapshot.connectedPhone || null,
      message:
        snapshot.status === "pending_qr" && snapshot.qrCode
          ? "Scan the QR code with WhatsApp on your phone."
          : snapshot.status === "pending_qr"
            ? "QR requested. Poll the status endpoint until qr_code is available."
          : snapshot.status === "connected"
            ? "WhatsApp already connected."
            : "Instance created. Try again in a moment.",
    });
  } catch (error) {
    const status = error instanceof Error && "statusCode" in error ? (error as { statusCode: number }).statusCode : 500;
    const message = error instanceof Error ? error.message : "Failed to connect WhatsApp instance.";

    return NextResponse.json(
      { error: { code: "CONNECTION_FAILED", message } },
      { status },
    );
  }
}
