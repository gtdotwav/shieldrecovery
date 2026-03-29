"use server";

import { revalidatePath } from "next/cache";

import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type { CallcenterSettingsInput, ConversationStatus, RecoveryLeadStatus, VoiceGender, VoiceTone } from "@/server/recovery/types";

/** Reusable result shape for future `useActionState` migration. */
export type ActionResult = { error?: string } | void;

async function getAccessibleConversation(input: {
  conversationId: string;
  role: "admin" | "seller";
  email?: string;
}) {
  const service = getPaymentRecoveryService();
  const conversation = await service.getConversationById(input.conversationId);

  if (!conversation) {
    return null;
  }

  if (input.role === "admin") {
    return conversation;
  }

  const contact = conversation.leadId
    ? (await service.getFollowUpContacts()).find(
        (item) => item.lead_id === conversation.leadId,
      ) ?? null
    : null;
  const assignedAgent = contact?.assigned_agent ?? conversation.assignedAgentName;
  const sellerIdentity = await getSellerIdentityByEmail(input.email);

  if (!canRoleAccessAgent(input.role, assignedAgent, sellerIdentity?.agentName)) {
    return null;
  }

  return conversation;
}

export async function transitionLeadStage(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "") as RecoveryLeadStatus;
  const intent = String(formData.get("intent") ?? "");

  if (!leadId || !status) {
    console.warn("[transitionLeadStage] Lead ou status ausente", { leadId, status });
    return;
  }

  try {
    if (session.role === "seller") {
      const sellerIdentity = await getSellerIdentityByEmail(session.email);
      const contact = (await service.getFollowUpContacts()).find(
        (item) => item.lead_id === leadId,
      );

      if (
        !contact ||
        !canRoleAccessAgent(session.role, contact.assigned_agent, sellerIdentity?.agentName)
      ) {
        console.warn("[transitionLeadStage] Sem permissao para acessar lead", {
          leadId,
          email: session.email,
        });
        return;
      }

      if (!sellerIdentity?.agentName) {
        console.warn("[transitionLeadStage] Identidade do seller nao configurada", {
          email: session.email,
        });
        return;
      }

      const assignedAgent = await service.ensureOperationalAgent({
        name: sellerIdentity.agentName,
        email: sellerIdentity.email,
        phone: "",
      });

      if (intent === "start_flow") {
        await service.startLeadFlow({ leadId, assignedAgent });
      } else {
        await service.moveLeadToStatus({ leadId, status, assignedAgent });
      }
    } else {
      if (intent === "start_flow") {
        await service.startLeadFlow({ leadId });
      } else {
        await service.moveLeadToStatus({ leadId, status });
      }
    }
  } catch (error) {
    console.error("[transitionLeadStage] Erro ao transicionar lead", {
      leadId,
      status,
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/inbox");
  revalidatePath("/ai");
}

export async function registerConversationReply(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "");

  if (!conversationId || !content.trim()) {
    console.warn("[registerConversationReply] Conversa ou conteudo ausente", {
      conversationId,
    });
    return;
  }

  const conversation = await getAccessibleConversation({
    conversationId,
    role: session.role,
    email: session.email,
  });

  if (!conversation) {
    console.warn("[registerConversationReply] Conversa nao encontrada ou sem permissao", {
      conversationId,
      email: session.email,
    });
    return;
  }

  try {
    await service.addManualConversationMessage({ conversationId, content });
  } catch (error) {
    console.error("[registerConversationReply] Erro ao registrar resposta", {
      conversationId,
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function sendAiConversationReply(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const conversationId = String(formData.get("conversationId") ?? "");

  if (!conversationId) {
    console.warn("[sendAiConversationReply] ID da conversa ausente");
    return;
  }

  const conversation = await getAccessibleConversation({
    conversationId,
    role: session.role,
    email: session.email,
  });

  if (!conversation) {
    console.warn("[sendAiConversationReply] Conversa nao encontrada ou sem permissao", {
      conversationId,
      email: session.email,
    });
    return;
  }

  try {
    await service.sendAiConversationReply({ conversationId });
  } catch (error) {
    console.error("[sendAiConversationReply] Erro ao enviar resposta da IA", {
      conversationId,
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function changeConversationStatus(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const conversationId = String(formData.get("conversationId") ?? "");
  const status = String(formData.get("status") ?? "") as ConversationStatus;

  if (!conversationId || !status) {
    console.warn("[changeConversationStatus] Conversa ou status ausente", {
      conversationId,
      status,
    });
    return;
  }

  const conversation = await getAccessibleConversation({
    conversationId,
    role: session.role,
    email: session.email,
  });

  if (!conversation) {
    console.warn("[changeConversationStatus] Conversa nao encontrada ou sem permissao", {
      conversationId,
      email: session.email,
    });
    return;
  }

  try {
    await service.updateConversationStatus({ conversationId, status });
  } catch (error) {
    console.error("[changeConversationStatus] Erro ao alterar status da conversa", {
      conversationId,
      status,
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  revalidatePath("/inbox");
}

/* ── CallCenter Actions ── */

export async function dispatchCall(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();

  const leadId = String(formData.get("leadId") ?? "");
  const toNumber = String(formData.get("toNumber") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const copy = String(formData.get("copy") ?? "");
  const product = String(formData.get("product") ?? "");
  const discountPercent = Number(formData.get("discountPercent") || 0);
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  const voiceTone = (String(formData.get("voiceTone") || "empathetic")) as VoiceTone;
  const voiceGender = (String(formData.get("voiceGender") || "female")) as VoiceGender;

  if (!toNumber.trim()) {
    console.warn("[dispatchCall] Numero de destino ausente");
    return;
  }

  // Resolve customer name from lead if not provided
  let resolvedName = customerName || "Cliente";
  let paymentValue: number | undefined;
  if (leadId) {
    const lead = await storage.findLeadByLeadId(leadId);
    if (lead) {
      resolvedName = lead.customerName || resolvedName;
      paymentValue = lead.paymentValue ? Number(lead.paymentValue) * 100 : undefined;
    }
  }

  try {
    const callRecord = await storage.createCall({
      leadId: leadId || undefined,
      toNumber: toNumber.trim(),
      copy: copy || undefined,
      product: product || undefined,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      couponCode: couponCode || undefined,
      voiceTone,
      voiceGender,
      provider: "vapi",
      direction: "outbound",
    });

    // Actually dispatch via Vapi
    const { getVapiService } = await import(
      "@/server/recovery/services/vapi-service"
    );
    const vapi = getVapiService();

    if (vapi.configured) {
      const script = copy || `Ligar para ${resolvedName} sobre pagamento pendente.`;
      await vapi.initiateCall({
        callRecord,
        customerName: resolvedName,
        script,
        product: product || undefined,
        paymentValue,
        voiceTone,
        voiceGender,
      });
    }
  } catch (error) {
    console.error("[dispatchCall] Erro ao disparar chamada", {
      toNumber,
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  revalidatePath("/calling");
}

export async function redialCall(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();
  const callId = String(formData.get("callId") ?? "").trim();

  if (!callId) return;

  const original = await storage.getCall(callId);
  if (!original) return;

  // Resolve name
  let customerName = "Cliente";
  let paymentValue: number | undefined;
  if (original.leadId) {
    const lead = await storage.findLeadByLeadId(original.leadId);
    if (lead) {
      customerName = lead.customerName || customerName;
      paymentValue = lead.paymentValue ? Number(lead.paymentValue) * 100 : undefined;
    }
  }

  try {
    const callRecord = await storage.createCall({
      leadId: original.leadId ?? undefined,
      toNumber: original.toNumber,
      copy: original.copy ?? undefined,
      product: original.product ?? undefined,
      discountPercent: original.discountPercent ?? undefined,
      couponCode: original.couponCode ?? undefined,
      voiceTone: (original.voiceTone as VoiceTone) ?? "empathetic",
      voiceGender: (original.voiceGender as VoiceGender) ?? "female",
      provider: "vapi",
      direction: "outbound",
    });

    const { getVapiService } = await import(
      "@/server/recovery/services/vapi-service"
    );
    const vapi = getVapiService();

    if (vapi.configured) {
      await vapi.initiateCall({
        callRecord,
        customerName,
        script: original.copy || `Ligar para ${customerName} sobre pagamento pendente.`,
        product: original.product ?? undefined,
        paymentValue,
        voiceTone: (original.voiceTone as VoiceTone) ?? "empathetic",
        voiceGender: (original.voiceGender as VoiceGender) ?? "female",
      });
    }
  } catch (error) {
    console.error("[redialCall]", error);
  }

  revalidatePath("/calling");
}

export async function markCallConverted(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();
  const callId = String(formData.get("callId") ?? "").trim();
  const leadId = String(formData.get("leadId") ?? "").trim();

  if (!callId) return;

  await storage.updateCall(callId, {
    outcome: "recovered",
    outcomeNotes: "Marcado como convertido manualmente pelo admin.",
  });

  if (leadId) {
    await storage.updateLeadStatus({ leadId, status: "RECOVERED" });
  }

  revalidatePath("/calling");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

export async function saveCallcenterSettings(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const storage = getStorageService();

  const sellerKey = String(formData.get("sellerKey") ?? session.email.split("@")[0]);
  const voiceTone = String(formData.get("voiceTone") || "empathetic") as VoiceTone;
  const voiceGender = String(formData.get("voiceGender") || "female") as VoiceGender;
  const discountPercent = Math.min(100, Math.max(0, Number(formData.get("discountPercent") || 0)));
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  const defaultCopy = String(formData.get("defaultCopy") ?? "");
  const defaultProduct = String(formData.get("defaultProduct") ?? "");
  const provider = String(formData.get("provider") || "vapi");
  const maxCallsPerDay = Math.max(1, Number(formData.get("maxCallsPerDay") || 50));
  const autoCallEnabled = formData.get("autoCallEnabled") === "on";

  try {
    await storage.upsertCallcenterSettings({
      sellerKey,
      voiceTone,
      voiceGender,
      discountPercent,
      couponCode,
      defaultCopy,
      defaultProduct,
      provider: provider as CallcenterSettingsInput["provider"],
      maxCallsPerDay,
      autoCallEnabled,
    });
  } catch (error) {
    console.error("[saveCallcenterSettings] Erro ao salvar configuracoes", {
      sellerKey,
      error: error instanceof Error ? error.message : error,
    });
    return;
  }

  revalidatePath("/calling");
}
