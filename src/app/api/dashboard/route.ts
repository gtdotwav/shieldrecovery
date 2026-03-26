import { requireApiAuth } from "@/server/auth/request";
import { apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/dashboard
 * Returns: { analytics: RecoveryAnalytics, activeLeads: number, recoveredLeads: number }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const service = getPaymentRecoveryService();
  const [analytics, contacts] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
  ]);

  const activeLeads = contacts.filter(
    (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
  ).length;
  const recoveredLeads = contacts.filter(
    (c) => c.lead_status === "RECOVERED",
  ).length;

  return apiOk({ analytics, activeLeads, recoveredLeads });
}
