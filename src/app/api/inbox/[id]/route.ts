import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/inbox/:id
 * Returns: { conversation: ConversationRecord, messages: MessageRecord[], lead?: FollowUpContact }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  const { id: conversationId } = await params;
  const service = getPaymentRecoveryService();
  const conversation = await service.getConversationById(conversationId);

  if (!conversation) {
    return apiError("Conversation not found.", 404);
  }

  if (auth.role === "seller") {
    const sellerIdentity = await getSellerIdentityByEmail(auth.email);
    const contact = conversation.leadId
      ? (await service.getFollowUpContacts()).find(
          (item) => item.lead_id === conversation.leadId,
        ) ?? null
      : null;
    const assignedAgent = contact?.assigned_agent ?? conversation.assignedAgentName;

    if (!canRoleAccessAgent(auth.role, assignedAgent, sellerIdentity?.agentName)) {
      return apiError("Forbidden.", 403);
    }
  }

  const messaging = new MessagingService();
  const messages = await messaging.getConversationMessages(conversationId);

  const contacts = await service.getFollowUpContacts();
  const lead = conversation.leadId
    ? contacts.find((c) => c.lead_id === conversation.leadId) ?? null
    : null;

  return apiOk({ conversation, messages, lead });
}
