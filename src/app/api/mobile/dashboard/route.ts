import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/mobile/dashboard
 * Mobile-optimized dashboard metrics, scoped to the authenticated seller.
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const service = getPaymentRecoveryService();
    const sellerIdentity =
      auth.role === "seller"
        ? await getSellerIdentityByEmail(auth.email)
        : null;

    let contacts = await service.getFollowUpContacts();

    // Scope to seller's leads
    if (auth.role === "seller") {
      contacts = contacts.filter((c) =>
        canRoleAccessAgent(auth.role, c.assigned_agent, sellerIdentity?.agentName),
      );
    }

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

    // Pipeline breakdown — map WAITING_CUSTOMER → WAITING_RESPONSE for the mobile app
    const pipeline = {
      NEW_RECOVERY: 0,
      CONTACTING: 0,
      WAITING_RESPONSE: 0,
      RECOVERED: 0,
      LOST: 0,
    };
    for (const c of contacts) {
      if (c.lead_status === "WAITING_CUSTOMER") {
        pipeline.WAITING_RESPONSE++;
      } else {
        const status = c.lead_status as keyof typeof pipeline;
        if (status in pipeline) {
          pipeline[status]++;
        }
      }
    }

    return apiOk({
      total_recovered_today: todayRecoveredAmount,
      total_recovered_week: weekRecoveredAmount,
      conversion_rate: conversionRate,
      active_leads: active.length,
      pipeline,
      // Extra fields for richer display
      today_count: todayRecovered.length,
      week_count: weekRecovered.length,
      total_recovered_count: recovered.length,
      total_recovered_amount: recovered.reduce(
        (sum, c) => sum + (c.payment_value || 0),
        0,
      ),
    });
  } catch (err) {
    console.error("[mobile/dashboard]", err);
    return apiError("Failed to load dashboard", 500);
  }
}
