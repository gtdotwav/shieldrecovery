import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import {
  getUsageSummary,
  getPartnerDashboardBilling,
} from "@/server/recovery/services/partner-billing-service";

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

/**
 * GET /api/admin/billing/usage/[partnerId]
 * Query params:
 *   - period_start, period_end (both required for custom range)
 *   - dashboard=true (returns full dashboard billing view with current period)
 * Returns: { usage: UsageSummaryItem[] } or { dashboard: PartnerDashboardBilling }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { partnerId } = await params;
  if (!partnerId) {
    return apiError("Missing partnerId.", 400, request);
  }

  const { searchParams } = new URL(request.url);
  const isDashboard = searchParams.get("dashboard") === "true";

  try {
    if (isDashboard) {
      const dashboard = await getPartnerDashboardBilling(partnerId);
      return apiOk({ dashboard }, 200, request);
    }

    const periodStart = searchParams.get("period_start");
    const periodEnd = searchParams.get("period_end");

    if (!periodStart || !periodEnd) {
      return apiError(
        "Required query params: period_start and period_end (YYYY-MM-DD), or dashboard=true.",
        400,
        request,
      );
    }

    const usage = await getUsageSummary(partnerId, periodStart, `${periodEnd}T23:59:59.999Z`);
    return apiOk({ usage }, 200, request);
  } catch (error) {
    console.error("[GET /api/admin/billing/usage/:partnerId]", error instanceof Error ? error.message : error);
    return apiError("Failed to get usage summary.", 500, request);
  }
}
