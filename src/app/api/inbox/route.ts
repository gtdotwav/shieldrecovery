import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/inbox
 * Query: ?status=open|pending|closed (optional filter)
 * Returns: { conversations: InboxConversation[], unreadCount: number }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  const service = getPaymentRecoveryService();
  const messaging = new MessagingService();

  const [allContacts, inboxSnapshot] = await Promise.all([
    service.getFollowUpContacts(),
    messaging.getInboxSnapshot(),
  ]);

  let conversations = inboxSnapshot.conversations;

  if (auth.role === "seller") {
    const sellerIdentity = await getSellerIdentityByEmail(auth.email);
    const accessibleLeadIds = new Set(
      allContacts
        .filter((c) =>
          canRoleAccessAgent(auth.role, c.assigned_agent, sellerIdentity?.agentName),
        )
        .map((c) => c.lead_id),
    );

    conversations = conversations.filter(
      (c) => !c.lead_id || accessibleLeadIds.has(c.lead_id),
    );
  }

  if (statusFilter) {
    conversations = conversations.filter((c) => c.status === statusFilter);
  }

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return apiOk({ conversations, unreadCount });
}
