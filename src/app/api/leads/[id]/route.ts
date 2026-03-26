import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/leads/:id
 * Returns: { lead: FollowUpContact }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const service = getPaymentRecoveryService();
  const contacts = await service.getFollowUpContacts();
  const lead = contacts.find((c) => c.lead_id === id);

  if (!lead) {
    return apiError("Lead not found.", 404);
  }

  if (auth.role === "seller") {
    const sellerIdentity = await getSellerIdentityByEmail(auth.email);
    if (!canRoleAccessAgent(auth.role, lead.assigned_agent, sellerIdentity?.agentName)) {
      return apiError("Forbidden.", 403);
    }
  }

  return apiOk({ lead });
}
