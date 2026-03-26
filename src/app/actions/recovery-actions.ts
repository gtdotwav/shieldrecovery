"use server";

import { revalidatePath } from "next/cache";

import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { ConversationStatus, RecoveryLeadStatus } from "@/server/recovery/types";

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
