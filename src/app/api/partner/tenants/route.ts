import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (!session || session.role !== "partner" || !session.partnerId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Partner session required." } },
      { status: 401 },
    );
  }

  const tenants = await getPartnerStorageService().listTenants(session.partnerId);

  return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session || session.role !== "partner" || !session.partnerId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Partner session required." } },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const tenantName = typeof body.tenantName === "string" ? body.tenantName.trim() : "";
  if (!tenantName) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "tenantName is required." } },
      { status: 400 },
    );
  }

  const storage = getPartnerStorageService();

  const tenant = await storage.saveTenant({
    partnerId: session.partnerId,
    tenantName,
    tenantEmail: typeof body.tenantEmail === "string" ? body.tenantEmail : undefined,
    tenantKey: typeof body.tenantKey === "string" ? body.tenantKey : undefined,
    gatewaySlug: typeof body.gatewaySlug === "string" ? body.gatewaySlug : undefined,
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata as Record<string, unknown> : undefined,
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
