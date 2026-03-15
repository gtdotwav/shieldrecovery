"use server";

import { revalidatePath } from "next/cache";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { ConversationStatus, RecoveryLeadStatus } from "@/server/recovery/types";

export async function transitionLeadStage(formData: FormData) {
  const service = getPaymentRecoveryService();
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "") as RecoveryLeadStatus;

  if (!leadId || !status) {
    return;
  }

  await service.moveLeadToStatus({ leadId, status });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/ai");
}

export async function registerConversationReply(formData: FormData) {
  const service = getPaymentRecoveryService();
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "");

  if (!conversationId || !content.trim()) {
    return;
  }

  await service.addManualConversationMessage({ conversationId, content });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function sendAiConversationReply(formData: FormData) {
  const service = getPaymentRecoveryService();
  const conversationId = String(formData.get("conversationId") ?? "");

  if (!conversationId) {
    return;
  }

  await service.sendAiConversationReply({ conversationId });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function changeConversationStatus(formData: FormData) {
  const service = getPaymentRecoveryService();
  const conversationId = String(formData.get("conversationId") ?? "");
  const status = String(formData.get("status") ?? "") as ConversationStatus;

  if (!conversationId || !status) {
    return;
  }

  await service.updateConversationStatus({ conversationId, status });
  revalidatePath("/inbox");
}
