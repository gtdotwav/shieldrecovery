"use server";

import { revalidatePath } from "next/cache";

import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { ConversationStatus, RecoveryLeadStatus } from "@/server/recovery/types";

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
    return;
  }

  if (session.role === "seller") {
    const sellerIdentity = await getSellerIdentityByEmail(session.email);
    const contact = (await service.getFollowUpContacts()).find(
      (item) => item.lead_id === leadId,
    );

    if (
      !contact ||
      !canRoleAccessAgent(session.role, contact.assigned_agent, sellerIdentity?.agentName)
    ) {
      return;
    }

    if (!sellerIdentity?.agentName) {
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

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/inbox");
    revalidatePath("/ai");
    return;
  }

  if (intent === "start_flow") {
    await service.startLeadFlow({ leadId });
  } else {
    await service.moveLeadToStatus({ leadId, status });
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
    return;
  }

  const conversation = await getAccessibleConversation({
    conversationId,
    role: session.role,
    email: session.email,
  });

  if (!conversation) {
    return;
  }

  await service.addManualConversationMessage({ conversationId, content });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function sendAiConversationReply(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const conversationId = String(formData.get("conversationId") ?? "");

  if (!conversationId) {
    return;
  }

  const conversation = await getAccessibleConversation({
    conversationId,
    role: session.role,
    email: session.email,
  });

  if (!conversation) {
    return;
  }

  await service.sendAiConversationReply({ conversationId });
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
    return;
  }

  const conversation = await getAccessibleConversation({
    conversationId,
    role: session.role,
    email: session.email,
  });

  if (!conversation) {
    return;
  }

  await service.updateConversationStatus({ conversationId, status });
  revalidatePath("/inbox");
}
