import { z } from "zod";
import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { RECOVERY_LEAD_PIPELINE } from "@/server/recovery/types";
import type { RecoveryLeadStatus } from "@/server/recovery/types";

const transitionSchema = z.object({
  status: z.enum(RECOVERY_LEAD_PIPELINE),
  intent: z.enum(["start_flow"]).optional(),
});

export function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/leads/:id/transition
 * Body: { status: RecoveryLeadStatus; intent?: "start_flow" }
 * Returns: { ok: true }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  const { id: leadId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = transitionSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body.", 400);
  }

  const status: RecoveryLeadStatus = parsed.data.status;

  const service = getPaymentRecoveryService();

  try {
    if (auth.role === "seller") {
      const sellerIdentity = await getSellerIdentityByEmail(auth.email);
      const contact = (await service.getFollowUpContacts()).find(
        (item) => item.lead_id === leadId,
      );

      if (
        !contact ||
        !canRoleAccessAgent(auth.role, contact.assigned_agent, sellerIdentity?.agentName)
      ) {
        return apiError("Forbidden.", 403);
      }

      if (!sellerIdentity?.agentName) {
        return apiError("Seller identity not configured.", 400);
      }

      const assignedAgent = await service.ensureOperationalAgent({
        name: sellerIdentity.agentName,
        email: sellerIdentity.email,
        phone: "",
      });

      if (parsed.data.intent === "start_flow") {
        await service.startLeadFlow({ leadId, assignedAgent });
      } else {
        await service.moveLeadToStatus({ leadId, status, assignedAgent });
      }
    } else {
      if (parsed.data.intent === "start_flow") {
        await service.startLeadFlow({ leadId });
      } else {
        await service.moveLeadToStatus({ leadId, status });
      }
    }
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to transition lead.",
      500,
    );
  }

  return apiOk({ ok: true });
}
