import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/mobile/dashboard
 * Mobile-optimized dashboard metrics.
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const service = getPaymentRecoveryService();
    const [analytics, contacts] = await Promise.all([
      service.getRecoveryAnalytics(),
      service.getFollowUpContacts(),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const recovered = contacts.filter((c) => c.lead_status === "RECOVERED");
    const active = contacts.filter(
      (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
    );

    const todayRecovered = recovered.filter(
      (c) => c.updated_at && new Date(c.updated_at) >= todayStart,
    );
    const weekRecovered = recovered.filter(
      (c) => c.updated_at && new Date(c.updated_at) >= weekStart,
    );

    const totalRecoveredAmount = recovered.reduce(
      (sum, c) => sum + (c.payment_value || 0),
      0,
    );
    const todayRecoveredAmount = todayRecovered.reduce(
      (sum, c) => sum + (c.payment_value || 0),
      0,
    );
    const weekRecoveredAmount = weekRecovered.reduce(
      (sum, c) => sum + (c.payment_value || 0),
      0,
    );

    const totalLeads = contacts.length || 1;
    const conversionRate = (recovered.length / totalLeads) * 100;

    const leadsByStatus = {
      NEW_RECOVERY: 0,
      CONTACTING: 0,
      WAITING_CUSTOMER: 0,
      RECOVERED: 0,
      LOST: 0,
    };
    for (const c of contacts) {
      const status = c.lead_status as keyof typeof leadsByStatus;
      if (status in leadsByStatus) {
        leadsByStatus[status]++;
      }
    }

    return apiOk({
      totalRecovered: recovered.length,
      totalRecoveredAmount,
      conversionRate,
      activeLeads: active.length,
      leadsByStatus,
      todayRecovered: todayRecovered.length,
      todayRecoveredAmount,
      weekRecovered: weekRecovered.length,
      weekRecoveredAmount,
    });
  } catch (err) {
    console.error("[mobile/dashboard]", err);
    return apiError("Failed to load dashboard", 500);
  }
}
