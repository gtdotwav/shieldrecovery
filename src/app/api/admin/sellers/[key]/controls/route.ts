import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { SellerAutonomyMode } from "@/server/recovery/types";

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

  let body: {
    sellerName?: string;
    sellerEmail?: string;
    recoveryTargetPercent?: number;
    reportedRecoveryRatePercent?: number;
    maxAssignedLeads?: number;
    autonomyMode?: SellerAutonomyMode;
    notes?: string;
    active?: boolean;
    inboxEnabled?: boolean;
    automationsEnabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

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
