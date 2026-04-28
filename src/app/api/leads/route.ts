import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { checkRateLimit, apiLimiter } from "@/server/recovery/utils/rate-limiter";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/leads
 * Query: ?scope=open|closed|all (default: open)
 * Returns: { leads: FollowUpContact[] }
 */
export async function GET(request: Request) {
  const rateLimited = checkRateLimit(request, apiLimiter);
  if (rateLimited) return rateLimited;

  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "open";

  const service = getPaymentRecoveryService();
  const sellerIdentity = auth.role === "seller"
    ? await getSellerIdentityByEmail(auth.email)
    : null;

  let contacts = await service.getFollowUpContacts();

  if (auth.role === "seller") {
    contacts = contacts.filter((c) =>
      canRoleAccessAgent(auth.role, c.assigned_agent, sellerIdentity?.agentName),
    );
  }

  if (scope === "open") {
    contacts = contacts.filter(
      (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
    );
  } else if (scope === "closed") {
    contacts = contacts.filter(
      (c) => c.lead_status === "RECOVERED" || c.lead_status === "LOST",
    );
  }

  return apiOk({ leads: contacts });
}
