import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { hashPlatformPassword } from "@/server/auth/passwords";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";
import { createApiKey } from "@/server/auth/api-keys";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await getPartnerStorageService().listProfiles();
  return NextResponse.json({ partners: profiles });
}

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!name || !contactEmail) {
    return NextResponse.json(
      { error: "name and contactEmail are required." },
      { status: 400 },
    );
  }

  const storage = getPartnerStorageService();

  // Create partner profile
  const profile = await storage.saveProfile({
    name,
    contactEmail,
    contactPhone: typeof body.contactPhone === "string" ? body.contactPhone : undefined,
    brandAccent: typeof body.brandAccent === "string" ? body.brandAccent : undefined,
    brandLogo: typeof body.brandLogo === "string" ? body.brandLogo : undefined,
    webhookUrl: typeof body.webhookUrl === "string" ? body.webhookUrl : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  // Create partner user (login credentials)
  let partnerUser = undefined;
  if (password) {
    const passwordHash = hashPlatformPassword(password);
    partnerUser = await storage.saveUser({
      partnerId: profile.id,
      email: contactEmail.toLowerCase(),
      passwordHash,
      displayName: name,
    });
  }

  // Create initial tenant if tenantName provided
  let tenant = undefined;
  const tenantName = typeof body.tenantName === "string" ? body.tenantName.trim() : "";
  if (tenantName) {
    // Create API key for the tenant
    const { record: apiKeyRecord, rawKey } = await createApiKey({
      name: `${name} — ${tenantName}`,
      role: "seller",
      sellerKey: profile.slug,
      scopes: ["partner:ingest"],
      createdByEmail: session.email,
    });

    tenant = await storage.saveTenant({
      partnerId: profile.id,
      tenantName,
      apiKeyId: apiKeyRecord.id,
    });

    return NextResponse.json(
      {
        partner: profile,
        user: partnerUser
          ? { id: partnerUser.id, email: partnerUser.email }
          : undefined,
        tenant,
        apiKey: rawKey,
      },
      { status: 201 },
    );
  }

  return NextResponse.json(
    {
      partner: profile,
      user: partnerUser
        ? { id: partnerUser.id, email: partnerUser.email }
        : undefined,
    },
    { status: 201 },
  );
}
