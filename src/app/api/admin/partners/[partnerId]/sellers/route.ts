import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { createApiKey } from "@/server/auth/api-keys";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";
import { getStorageService } from "@/server/recovery/services/storage";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ partnerId: string }> };

/**
 * GET /api/admin/partners/{partnerId}/sellers
 * List all sellers (tenants) under a partner with their API key status.
 */
export async function GET(_request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partnerId } = await params;
  const partnerStorage = getPartnerStorageService();

  const profile = await partnerStorage.getProfile(partnerId);
  if (!profile) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }

  const tenants = await partnerStorage.listTenants(partnerId);

  return NextResponse.json({
    partner: { id: profile.id, name: profile.name, slug: profile.slug },
    sellers: tenants.map((t) => ({
      id: t.id,
      tenant_key: t.tenantKey,
      tenant_name: t.tenantName,
      tenant_email: t.tenantEmail,
      active: t.active,
      api_key_id: t.apiKeyId ?? null,
      created_at: t.createdAt,
    })),
  });
}

/**
 * POST /api/admin/partners/{partnerId}/sellers
 * Provision a new seller under a partner:
 *   1. Creates seller_admin_controls
 *   2. Creates API key (scoped to seller_key)
 *   3. Creates partner_tenant linking to partner
 *
 * Body: { name, email?, sellerKey? }
 * Returns: { seller, apiKey (raw, shown once) }
 */
export async function POST(request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partnerId } = await params;
  const partnerStorage = getPartnerStorageService();

  const profile = await partnerStorage.getProfile(partnerId);
  if (!profile) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const sellerKey =
    typeof body.sellerKey === "string"
      ? body.sellerKey.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
      : name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // 1. Create seller_admin_controls
  const storage = getStorageService();
  const sellerControl = await storage.saveSellerAdminControl({
    sellerKey,
    sellerName: name,
    sellerEmail: email,
    active: true,
    gatewaySlug: "partner",
    autonomyMode: "autonomous",
  });

  // 2. Create API key scoped to this seller
  const { record: apiKeyRecord, rawKey } = await createApiKey({
    name: `${profile.name} — ${name}`,
    role: "seller",
    sellerKey,
    scopes: ["partner:ingest", "partner:v1:read", "partner:v1:write"],
    rateLimitPerMinute: 60,
    createdByEmail: session.email,
  });

  // 3. Create partner tenant
  const tenant = await partnerStorage.saveTenant({
    partnerId,
    tenantKey: sellerKey,
    tenantName: name,
    tenantEmail: email,
    gatewaySlug: "partner",
    apiKeyId: apiKeyRecord.id,
  });

  return NextResponse.json(
    {
      seller: {
        id: tenant.id,
        tenant_key: tenant.tenantKey,
        tenant_name: tenant.tenantName,
        seller_control_id: sellerControl.id,
        active: true,
      },
      api_key: {
        id: apiKeyRecord.id,
        raw_key: rawKey,
        prefix: apiKeyRecord.keyPrefix,
        scopes: apiKeyRecord.scopes,
        warning: "This key is shown only once. Save it now.",
      },
    },
    { status: 201 },
  );
}
