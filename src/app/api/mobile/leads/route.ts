import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

const PAGE_SIZE = 20;

const VALID_STATUSES = new Set([
  "NEW_RECOVERY",
  "CONTACTING",
  "WAITING_CUSTOMER",
  "RECOVERED",
  "LOST",
]);

/**
 * GET /api/mobile/leads?status=&page=1
 * Paginated leads list filtered by status.
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const statusFilter = url.searchParams.get("status")?.trim().toUpperCase() || "";

    // Normalize WAITING_RESPONSE → WAITING_CUSTOMER (app uses WAITING_RESPONSE)
    const normalizedStatus =
      statusFilter === "WAITING_RESPONSE" ? "WAITING_CUSTOMER" : statusFilter;

    if (normalizedStatus && !VALID_STATUSES.has(normalizedStatus)) {
      return apiError(`Invalid status filter: ${statusFilter}`, 400);
    }

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

    // Filter by status
    if (normalizedStatus) {
      contacts = contacts.filter((c) => c.lead_status === normalizedStatus);
    }

    // Sort by most recent first
    contacts.sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });

    const total = contacts.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const offset = (page - 1) * PAGE_SIZE;
    const pageContacts = contacts.slice(offset, offset + PAGE_SIZE);

    const leads = pageContacts.map((c) => ({
      id: c.lead_id,
      customer_name: c.customer_name,
      customer_phone: c.phone,
      amount: c.payment_value,
      status: c.lead_status === "WAITING_CUSTOMER" ? "WAITING_RESPONSE" : c.lead_status,
      payment_method: c.payment_method,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return apiOk({ leads, total, page, totalPages });
  } catch (err) {
    console.error("[mobile/leads]", err);
    return apiError("Failed to load leads", 500);
  }
}
