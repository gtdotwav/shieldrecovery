"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";
import { getStorageService } from "@/server/recovery/services/storage";
import { createApiKey } from "@/server/auth/api-keys";

// ── Update partner webhook URL ──

export async function updatePartnerWebhookAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const partnerId = formData.get("partnerId") as string;
  const webhookUrl = (formData.get("webhookUrl") as string)?.trim() ?? "";

  if (!partnerId) {
    redirect("/admin?tab=partners&status=error&message=Partner+ID+obrigatorio");
  }

  const storage = getPartnerStorageService();
  const profile = await storage.getProfile(partnerId);

  if (!profile) {
    redirect("/admin?tab=partners&status=error&message=Partner+nao+encontrado");
  }

  await storage.saveProfile(
    {
      name: profile.name,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      webhookUrl,
      brandAccent: profile.brandAccent,
      brandLogo: profile.brandLogo,
      notes: profile.notes,
      active: profile.active,
    },
    partnerId,
  );

  revalidatePath("/admin");
  redirect("/admin?tab=partners&status=ok&message=Webhook+URL+atualizada");
}

// ── Toggle partner active status ──

export async function togglePartnerActiveAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const partnerId = formData.get("partnerId") as string;
  const active = formData.get("active") === "true";

  if (!partnerId) {
    redirect("/admin?tab=partners&status=error&message=Partner+ID+obrigatorio");
  }

  const storage = getPartnerStorageService();
  const profile = await storage.getProfile(partnerId);

  if (!profile) {
    redirect("/admin?tab=partners&status=error&message=Partner+nao+encontrado");
  }

  await storage.saveProfile(
    {
      name: profile.name,
      contactEmail: profile.contactEmail,
      active,
    },
    partnerId,
  );

  revalidatePath("/admin");
  redirect(`/admin?tab=partners&status=ok&message=Partner+${active ? "ativado" : "desativado"}`);
}

// ── Add seller to partner ──

export async function addPartnerSellerAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin"]);

  const partnerId = formData.get("partnerId") as string;
  const sellerName = (formData.get("sellerName") as string)?.trim() ?? "";
  const sellerEmail = (formData.get("sellerEmail") as string)?.trim().toLowerCase() ?? "";

  if (!partnerId || !sellerName) {
    redirect("/admin?tab=partners&status=error&message=Nome+do+seller+obrigatorio");
  }

  const partnerStorage = getPartnerStorageService();
  const profile = await partnerStorage.getProfile(partnerId);

  if (!profile) {
    redirect("/admin?tab=partners&status=error&message=Partner+nao+encontrado");
  }

  // Derive seller key from name
  const sellerKey = sellerName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // 1. Create seller_admin_controls
  const storage = getStorageService();
  await storage.saveSellerAdminControl({
    sellerKey,
    sellerName,
    sellerEmail,
    active: true,
    gatewaySlug: "partner",
    autonomyMode: "autonomous",
  });

  // 2. Create scoped API key
  const { record: apiKeyRecord, rawKey } = await createApiKey({
    name: `${profile.name} — ${sellerName}`,
    role: "seller",
    sellerKey,
    scopes: ["partner:ingest", "partner:v1:read", "partner:v1:write"],
    rateLimitPerMinute: 60,
    createdByEmail: session.email,
  });

  // 3. Generate HMAC secret for this seller's postbacks
  const webhookSecret = randomBytes(32).toString("hex");

  // 4. Create partner tenant
  await partnerStorage.saveTenant({
    partnerId,
    tenantKey: sellerKey,
    tenantName: sellerName,
    tenantEmail: sellerEmail,
    gatewaySlug: "partner",
    apiKeyId: apiKeyRecord.id,
    webhookSecret,
  });

  revalidatePath("/admin");
  redirect(
    `/admin?tab=partners&status=ok&message=Seller+${encodeURIComponent(sellerName)}+criado&newApiKey=${encodeURIComponent(rawKey)}&newSellerKey=${encodeURIComponent(sellerKey)}&newHmacSecret=${encodeURIComponent(webhookSecret)}`,
  );
}

// ── Toggle tenant active status ──

export async function toggleTenantActiveAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const tenantId = formData.get("tenantId") as string;
  const partnerId = formData.get("partnerId") as string;
  const active = formData.get("active") === "true";

  if (!tenantId || !partnerId) {
    redirect("/admin?tab=partners&status=error&message=IDs+obrigatorios");
  }

  const storage = getPartnerStorageService();
  const tenant = await storage.getTenant(tenantId);

  if (!tenant) {
    redirect("/admin?tab=partners&status=error&message=Tenant+nao+encontrado");
  }

  await storage.saveTenant(
    {
      partnerId,
      tenantKey: tenant.tenantKey,
      tenantName: tenant.tenantName,
      tenantEmail: tenant.tenantEmail,
      active,
      apiKeyId: tenant.apiKeyId,
    },
    tenantId,
  );

  revalidatePath("/admin");
  redirect(`/admin?tab=partners&status=ok&message=Seller+${active ? "ativado" : "desativado"}`);
}
