import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/calendar?month=YYYY-MM
 * Returns: CalendarSnapshot
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  const url = new URL(request.url);
  const month = url.searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return apiError("month query parameter is required (format: YYYY-MM).", 400);
  }

  const service = getPaymentRecoveryService();

  let visibleLeadIds: string[] | undefined;
  if (auth.role === "seller") {
    const sellerIdentity = await getSellerIdentityByEmail(auth.email);
    const contacts = await service.getFollowUpContacts();
    visibleLeadIds = contacts
      .filter((c) =>
        canRoleAccessAgent(auth.role, c.assigned_agent, sellerIdentity?.agentName),
      )
      .map((c) => c.lead_id);
  }

  const snapshot = await service.getCalendarSnapshot({ month, visibleLeadIds });
  return apiOk(snapshot);
}
