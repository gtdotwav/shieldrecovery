import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getComplianceService } from "@/server/recovery/services/compliance-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/admin/compliance
 * Returns LGPD compliance dashboard summary: consents, deletions, retention, recent logs.
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const service = getComplianceService();
    const summary = await service.getDashboardSummary();

    // Log dashboard access
    await service.logDataAccess(
      auth.email,
      auth.role,
      "view_compliance_dashboard",
      "compliance",
    );

    return apiOk(summary);
  } catch (error) {
    console.error("[GET /api/admin/compliance]", error instanceof Error ? error.message : error);
    return apiError("Failed to load compliance dashboard.", 500);
  }
}
