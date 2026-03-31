"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type { GatewayProvider, SellerAutonomyMode, SellerMessagingApproach } from "@/server/recovery/types";
import { GATEWAY_PROVIDERS } from "@/server/recovery/types";
import { hashPlatformPassword } from "@/server/auth/passwords";

const saveSellerUserSchema = z.object({
  email: z.string().email("Email invalido"),
  displayName: z.string().optional(),
  agentName: z.string().min(1, "Nome do agente obrigatorio"),
  password: z.string().optional(),
  active: z.boolean(),
});

const createSellerInviteSchema = z.object({
  email: z.string().email("Email do seller obrigatorio"),
});

function revalidateAdminRoutes() {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/inbox");
  revalidatePath("/ai");
}

export async function saveSellerUserAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const parsed = saveSellerUserSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    displayName: String(formData.get("displayName") ?? "").trim() || undefined,
    agentName: String(formData.get("agentName") ?? "").trim(),
    password: String(formData.get("password") ?? "").trim() || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Seller invalido";
    redirect(`/admin?status=error&message=${encodeURIComponent(message)}`);
  }

  const { email, displayName, agentName, password, active } = parsed.data;

  const existingSeller = await getStorageService().findSellerUserByEmail(email);

  if (!existingSeller && !password) {
    redirect("/admin?status=error&message=Senha%20inicial%20obrigatoria");
  }

  const input = {
    email,
    displayName: displayName || agentName,
    agentName,
    active,
    passwordHash: password ? hashPlatformPassword(password) : undefined,
  };

  try {
    await getPaymentRecoveryService().saveSellerUser(input);
    await getPaymentRecoveryService().saveSellerAdminControl({
      sellerKey: agentName,
      sellerName: agentName,
      sellerEmail: email,
      active,
    });
  } catch (error) {
    console.error("[saveSellerUser]", error instanceof Error ? error.message : error);
    redirect("/admin?status=error&message=Erro%20ao%20salvar%20seller");
  }

  revalidateAdminRoutes();
  redirect(`/admin?status=ok&saved=${encodeURIComponent(email)}`);
}

export async function createSellerInviteAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin"]);

  const emailParsed = createSellerInviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });

  if (!emailParsed.success) {
    const message = emailParsed.error.issues[0]?.message ?? "Email do seller obrigatorio";
    redirect(`/admin?status=error&message=${encodeURIComponent(message)}`);
  }

  const email = emailParsed.data.email;
  const suggestedDisplayName = String(formData.get("suggestedDisplayName") ?? "").trim();
  const agentName = String(formData.get("agentName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const expiresInDays = Number(String(formData.get("expiresInDays") ?? "7"));

  try {
    await getPaymentRecoveryService().createSellerInvite({
      email,
      suggestedDisplayName: suggestedDisplayName || undefined,
      agentName: agentName || undefined,
      note: note || undefined,
      createdByEmail: session.email,
      expiresInDays: Number.isFinite(expiresInDays) ? expiresInDays : 7,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel gerar o convite";
    redirect(`/admin?status=error&message=${encodeURIComponent(message)}`);
  }

  revalidateAdminRoutes();
  redirect(`/admin?status=ok&saved=${encodeURIComponent(email)}&mode=invite`);
}

export async function saveSellerControlAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const sellerKey = String(formData.get("sellerKey") ?? "").trim();
  const sellerName = String(formData.get("sellerName") ?? "").trim();
  const sellerEmail = String(formData.get("sellerEmail") ?? "").trim();
  const recoveryTargetPercent = Number(
    String(formData.get("recoveryTargetPercent") ?? "18"),
  );
  const reportedRecoveryRateRaw = String(
    formData.get("reportedRecoveryRatePercent") ?? "",
  ).trim();
  const maxAssignedLeads = Number(String(formData.get("maxAssignedLeads") ?? "30"));
  const autonomyMode = String(formData.get("autonomyMode") ?? "autonomous") as SellerAutonomyMode;
  const messagingApproach = String(formData.get("messagingApproach") ?? "friendly") as SellerMessagingApproach;
  const notes = String(formData.get("notes") ?? "").trim();
  const checkoutUrl = String(formData.get("checkoutUrl") ?? "").trim();
  const checkoutApiKey = String(formData.get("checkoutApiKey") ?? "").trim();
  const gatewayApiKey = String(formData.get("gatewayApiKey") ?? "").trim();
  const whitelabelId = String(formData.get("whitelabelId") ?? "").trim();

  if (!sellerKey) {
    redirect("/admin?status=error&message=Seller%20invalido");
  }

  try {
    await getPaymentRecoveryService().saveSellerAdminControl({
      sellerKey,
      sellerName,
      sellerEmail: sellerEmail || undefined,
      recoveryTargetPercent,
      reportedRecoveryRatePercent: reportedRecoveryRateRaw
        ? Number(reportedRecoveryRateRaw)
        : undefined,
      maxAssignedLeads,
      active: formData.get("active") === "on",
      inboxEnabled: formData.get("inboxEnabled") === "on",
      automationsEnabled: formData.get("automationsEnabled") === "on",
      autonomyMode:
        autonomyMode === "assisted" ||
        autonomyMode === "supervised" ||
        autonomyMode === "autonomous"
          ? autonomyMode
          : "autonomous",
      messagingApproach:
        messagingApproach === "friendly" ||
        messagingApproach === "professional" ||
        messagingApproach === "urgent"
          ? messagingApproach
          : "friendly",
      checkoutUrl: checkoutUrl || undefined,
      checkoutApiKey: checkoutApiKey || undefined,
      gatewayApiKey: gatewayApiKey || undefined,
      whitelabelId: whitelabelId || undefined,
      notes: notes || undefined,
    });
  } catch (error) {
    console.error("[saveSellerControl]", error instanceof Error ? error.message : error);
    redirect("/admin?status=error&message=Erro%20ao%20salvar%20configurações%20do%20seller");
  }

  revalidateAdminRoutes();
  redirect(`/admin?status=ok&saved=${encodeURIComponent(sellerKey)}`);
}

/* ── Whitelabel Profile Actions ── */

export async function saveWhitelabelProfileAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const id = String(formData.get("id") ?? "").trim() || undefined;
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const gatewayProvider = String(formData.get("gatewayProvider") ?? "custom").trim();
  const gatewayBaseUrl = String(formData.get("gatewayBaseUrl") ?? "").trim();
  const gatewayDocsUrl = String(formData.get("gatewayDocsUrl") ?? "").trim();
  const gatewayWebhookPath = String(formData.get("gatewayWebhookPath") ?? "").trim();
  const checkoutUrl = String(formData.get("checkoutUrl") ?? "").trim();
  const checkoutApiKey = String(formData.get("checkoutApiKey") ?? "").trim();
  const brandAccent = String(formData.get("brandAccent") ?? "").trim();
  const brandLogo = String(formData.get("brandLogo") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) {
    redirect("/admin/whitelabel?status=error&message=Nome%20obrigatorio");
  }

  const validProvider = (GATEWAY_PROVIDERS as readonly string[]).includes(gatewayProvider)
    ? (gatewayProvider as GatewayProvider)
    : ("custom" as GatewayProvider);

  try {
    await getPaymentRecoveryService().saveWhitelabelProfile(
      {
        name,
        slug: slug || undefined,
        gatewayProvider: validProvider,
        gatewayBaseUrl: gatewayBaseUrl || undefined,
        gatewayDocsUrl: gatewayDocsUrl || undefined,
        gatewayWebhookPath: gatewayWebhookPath || undefined,
        checkoutUrl: checkoutUrl || undefined,
        checkoutApiKey: checkoutApiKey || undefined,
        brandAccent: brandAccent || undefined,
        brandLogo: brandLogo || undefined,
        active,
        notes: notes || undefined,
      },
      id,
    );
  } catch (error) {
    console.error("[saveWhitelabelProfile]", error instanceof Error ? error.message : error);
    redirect("/admin/whitelabel?status=error&message=Erro%20ao%20salvar%20perfil");
  }

  revalidatePath("/admin/whitelabel");
  revalidatePath("/admin");
  revalidatePath("/connect");
  redirect(
    `/admin/whitelabel?status=ok&saved=${encodeURIComponent(name)}`,
  );
}

export async function deleteWhitelabelProfileAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/admin/whitelabel?status=error&message=ID%20obrigatorio");
  }

  try {
    await getPaymentRecoveryService().deleteWhitelabelProfile(id);
  } catch (error) {
    console.error("[deleteWhitelabelProfile]", error instanceof Error ? error.message : error);
    redirect("/admin/whitelabel?status=error&message=Erro%20ao%20remover%20perfil");
  }

  revalidatePath("/admin/whitelabel");
  revalidatePath("/admin");
  redirect("/admin/whitelabel?status=ok&message=Perfil%20removido");
}

/* ── Quiz Lead Actions ── */

export async function sendQuizLeadWhatsAppAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const leadId = String(formData.get("leadId") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!leadId || !phone) {
    redirect("/admin?status=error&message=Lead%20ou%20telefone%20invalido");
  }

  const content =
    message ||
    "Oi! Vi que voce se interessou pela PagRecovery. Posso te ajudar a entender como funciona a plataforma? Estamos aceitando os primeiros clientes!";

  const storage = getStorageService();
  const { MessagingService } = await import(
    "@/server/recovery/services/messaging-service"
  );
  const messaging = new MessagingService();

  const conversation = await storage.upsertConversation({
    channel: "whatsapp",
    contactValue: phone,
    customerName: "Quiz Lead",
  });

  const result = await messaging.dispatchOutboundMessage({
    conversation,
    content,
  });

  if (result.status === "failed") {
    redirect(
      `/admin?status=error&message=${encodeURIComponent(result.error ?? "Falha ao enviar WhatsApp")}`,
    );
  }

  await storage.createMessage({
    conversationId: conversation.id,
    channel: "whatsapp",
    direction: "outbound",
    senderAddress: "system",
    content,
    status: result.status === "sent" ? "sent" : "queued",
    senderName: "PagRecovery",
    providerMessageId: result.providerMessageId,
  });

  await storage.updateQuizLead(leadId, {
    status: "contacted",
    whatsappSentAt: new Date().toISOString(),
  });

  revalidateAdminRoutes();
  redirect("/admin?status=ok&message=WhatsApp%20enviado%20com%20sucesso");
}

export async function saveSellerGatewayKeyAction(formData: FormData) {
  await requireAuthenticatedSession(["admin", "seller"]);

  const sellerKey = String(formData.get("sellerKey") ?? "").trim();
  const gatewayApiKey = String(formData.get("gatewayApiKey") ?? "").trim();
  const whitelabelId = String(formData.get("whitelabelId") ?? "").trim();

  if (!sellerKey) {
    redirect("/connect?status=error&message=Seller%20invalido");
  }

  try {
    await getPaymentRecoveryService().saveSellerAdminControl({
      sellerKey,
      gatewayApiKey: gatewayApiKey || undefined,
      whitelabelId: whitelabelId || undefined,
    });
  } catch (error) {
    console.error("[saveSellerGatewayKey]", error instanceof Error ? error.message : error);
    redirect("/connect?status=error&message=Erro%20ao%20salvar%20chave%20do%20gateway");
  }

  revalidatePath("/connect");
  redirect("/connect?status=ok&saved=gateway");
}
