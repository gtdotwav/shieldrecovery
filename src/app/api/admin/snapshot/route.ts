import { requireApiAuth } from "@/server/auth/request";
import { apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/admin/snapshot
 * Returns: AdminPanelSnapshot (sellers, users, invites, worker, KPIs)
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const snapshot = await getPaymentRecoveryService().getAdminPanelSnapshot();
  return apiOk(snapshot);
}
