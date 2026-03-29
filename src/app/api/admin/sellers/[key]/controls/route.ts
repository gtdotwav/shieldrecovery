import { z } from "zod";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { SELLER_AUTONOMY_MODES } from "@/server/recovery/types";

const controlsSchema = z.object({
  sellerName: z.string().optional(),
  sellerEmail: z.string().email().optional(),
  recoveryTargetPercent: z.number().min(0).max(100).optional(),
  reportedRecoveryRatePercent: z.number().min(0).max(100).optional(),
  maxAssignedLeads: z.number().int().min(0).optional(),
  autonomyMode: z.enum(SELLER_AUTONOMY_MODES).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
  inboxEnabled: z.boolean().optional(),
  automationsEnabled: z.boolean().optional(),
});

export function OPTIONS() {
  return corsOptions();
}

/**
 * PUT /api/admin/sellers/:key/controls
 * Body: SellerAdminControlInput fields
 * Returns: { control: SellerAdminControlRecord }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { key: sellerKey } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = controlsSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body.", 400);
  }

  const body = parsed.data;

  const service = getPaymentRecoveryService();

  try {
    const control = await service.saveSellerAdminControl({
      sellerKey,
      sellerName: body.sellerName ?? sellerKey,
      sellerEmail: body.sellerEmail,
      recoveryTargetPercent: body.recoveryTargetPercent,
      reportedRecoveryRatePercent: body.reportedRecoveryRatePercent,
      maxAssignedLeads: body.maxAssignedLeads,
      autonomyMode: body.autonomyMode,
      notes: body.notes,
      active: body.active,
      inboxEnabled: body.inboxEnabled,
      automationsEnabled: body.automationsEnabled,
    });

    return apiOk({ control });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to update controls.",
      500,
    );
  }
}
