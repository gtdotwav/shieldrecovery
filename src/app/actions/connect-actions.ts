"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPlatformBootstrapService } from "@/server/recovery/services/platform-bootstrap-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";

function revalidateOperationalRoutes() {
  revalidatePath("/connect");
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/leads");
  revalidatePath("/test");
}

export async function saveConnectionSettingsAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const scope = String(formData.get("scope") ?? "").trim();
  const settingsService = getConnectionSettingsService();

  if (!scope) {
    redirect("/connect?status=error&message=Escopo%20invalido");
  }

  switch (scope) {
    case "workspace":
      await settingsService.saveSettings({
        appBaseUrl: String(formData.get("appBaseUrl") ?? "").trim(),
        webhookSecret: String(formData.get("webhookSecret") ?? "").trim(),
        webhookToleranceSeconds: Number(
          String(formData.get("webhookToleranceSeconds") ?? "300"),
        ),
      });
      break;
    case "whatsapp":
      await settingsService.saveSettings({
        whatsappProvider:
          String(formData.get("whatsappProvider") ?? "cloud_api") === "web_api"
            ? "web_api"
            : "cloud_api",
        whatsappApiBaseUrl: String(
          formData.get("whatsappApiBaseUrl") ?? "",
        ).trim(),
        whatsappAccessToken: String(
          formData.get("whatsappAccessToken") ?? "",
        ).trim(),
        whatsappWebSessionId: String(
          formData.get("whatsappWebSessionId") ?? "",
        ).trim(),
        whatsappPhoneNumberId: String(
          formData.get("whatsappPhoneNumberId") ?? "",
        ).trim(),
        whatsappBusinessAccountId: String(
          formData.get("whatsappBusinessAccountId") ?? "",
        ).trim(),
        whatsappWebhookVerifyToken: String(
          formData.get("whatsappWebhookVerifyToken") ?? "",
        ).trim(),
        whatsappWebSessionStatus: "disconnected",
        whatsappWebSessionQrCode: "",
        whatsappWebSessionPhone: "",
        whatsappWebSessionError: "",
        whatsappWebSessionUpdatedAt: new Date().toISOString(),
      });
      break;
    case "email":
      await settingsService.saveSettings({
        emailApiKey: String(formData.get("emailApiKey") ?? "").trim(),
        emailFromAddress: String(
          formData.get("emailFromAddress") ?? "",
        ).trim(),
      });
      break;
    case "crm":
      await settingsService.saveSettings({
        crmApiUrl: String(formData.get("crmApiUrl") ?? "").trim(),
        crmApiKey: String(formData.get("crmApiKey") ?? "").trim(),
      });
      break;
    case "ai":
      await settingsService.saveSettings({
        openAiApiKey: String(formData.get("openAiApiKey") ?? "").trim(),
      });
      break;
    default:
      redirect("/connect?status=error&message=Escopo%20desconhecido");
  }

  revalidateOperationalRoutes();
  redirect(`/connect?status=ok&saved=${encodeURIComponent(scope)}`);
}

export async function saveDatabaseBootstrapAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const supabaseUrl = String(formData.get("supabaseUrl") ?? "").trim();
  const supabaseServiceRoleKey = String(
    formData.get("supabaseServiceRoleKey") ?? "",
  ).trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    redirect("/connect?status=error&message=Informe%20URL%20e%20Service%20Role%20do%20Supabase");
  }

  try {
    const client = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error } = await client
      .from("connection_settings")
      .select("id")
      .limit(1);

    if (error) {
      const message = error.message.toLowerCase();

      if (message.includes("relation") || message.includes("does not exist")) {
        redirect("/connect?status=error&message=Aplique%20primeiro%20o%20schema%20em%20supabase/schema.sql");
      }

      if (
        message.includes("jwt") ||
        message.includes("permission") ||
        message.includes("invalid")
      ) {
        redirect("/connect?status=error&message=Credenciais%20do%20Supabase%20invalidas");
      }

      redirect("/connect?status=error&message=Erro%20ao%20validar%20conexão%20com%20o%20banco");
    }

    getPlatformBootstrapService().saveSettings({
      supabaseUrl,
      supabaseServiceRoleKey,
    });
  } catch (error) {
    console.error("[saveDatabaseBootstrap]", error instanceof Error ? error.message : error);
    redirect("/connect?status=error&message=Falha%20ao%20validar%20o%20Supabase");
  }

  revalidateOperationalRoutes();
  redirect("/connect?status=ok&saved=database");
}

export async function startWhatsAppQrSessionAction() {
  await requireAuthenticatedSession(["admin", "seller"]);
  try {
    await new MessagingService().startWhatsAppWebSession();
  } catch (error) {
    console.error("[startWhatsAppQrSession]", error instanceof Error ? error.message : error);
    redirect("/connect?status=error&message=Falha%20ao%20iniciar%20sessão%20QR");
  }

  revalidateOperationalRoutes();
  redirect("/connect?status=ok&saved=whatsapp_qr");
}

export async function refreshWhatsAppQrSessionAction() {
  await requireAuthenticatedSession(["admin", "seller"]);
  try {
    await new MessagingService().refreshWhatsAppWebSession();
  } catch (error) {
    console.error("[refreshWhatsAppQrSession]", error instanceof Error ? error.message : error);
    redirect("/connect?status=error&message=Falha%20ao%20atualizar%20sessão%20QR");
  }

  revalidateOperationalRoutes();
  redirect("/connect?status=ok&saved=whatsapp_qr");
}

export async function disconnectWhatsAppQrSessionAction() {
  await requireAuthenticatedSession(["admin", "seller"]);
  try {
    await new MessagingService().disconnectWhatsAppWebSession();
  } catch (error) {
    console.error("[disconnectWhatsAppQrSession]", error instanceof Error ? error.message : error);
    redirect("/connect?status=error&message=Falha%20ao%20desconectar%20sessão%20QR");
  }

  revalidateOperationalRoutes();
  redirect("/connect?status=ok&saved=whatsapp_qr");
}

export async function saveSellerAiGuidanceAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["seller", "admin"]);
  const guidance = String(formData.get("sellerAiGuidance") ?? "").trim();
  const sellerIdentity = await getSellerIdentityByEmail(session.email);

  if (!sellerIdentity?.agentName) {
    redirect("/connect?status=error&message=Seller%20nao%20identificado");
  }

  await getPaymentRecoveryService().saveSellerAdminControl({
    sellerKey: sellerIdentity.agentName,
    sellerName: sellerIdentity.agentName,
    sellerEmail: sellerIdentity.email,
    notes: guidance || undefined,
  });

  revalidateOperationalRoutes();
  redirect("/connect?status=ok&saved=seller_ai_guidance");
}
