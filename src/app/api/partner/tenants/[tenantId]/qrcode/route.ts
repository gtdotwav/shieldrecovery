import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";

type RouteProps = {
  params: Promise<{ tenantId: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();

  if (!session || (session.role !== "partner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await params;
  const storage = getPartnerStorageService();
  const tenant = await storage.getTenant(tenantId);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Partner can only access their own tenants
  if (session.role === "partner" && session.partnerId !== tenant.partnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pagrecovery.com";
  const ingestUrl = `${baseUrl}/api/partner/ingest`;

  const qrData = JSON.stringify({
    endpoint: ingestUrl,
    tenant_key: tenant.tenantKey,
    tenant_name: tenant.tenantName,
  });

  const pngBuffer = await QRCode.toBuffer(qrData, {
    type: "png",
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qrcode-${tenant.tenantKey}.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
