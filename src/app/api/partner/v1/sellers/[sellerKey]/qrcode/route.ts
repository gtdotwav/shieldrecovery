import { NextResponse } from "next/server";
import QRCode from "qrcode";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pagrecovery.com";
  const ingestUrl = `${baseUrl}/api/partner/ingest`;

  // QR code encodes the integration config for this seller
  const qrPayload = JSON.stringify({
    platform: "PagRecovery",
    endpoint: ingestUrl,
    seller_key: sellerKey,
    docs: `${baseUrl}/api/partner/ingest`,
  });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "png";
  const size = Math.min(Number(searchParams.get("size")) || 400, 1024);

  if (format === "svg") {
    const svg = await QRCode.toString(qrPayload, {
      type: "svg",
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const pngBuffer = await QRCode.toBuffer(qrPayload, {
    type: "png",
    width: size,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qrcode-${sellerKey}.png"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
