import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/admin/invites
 * Body: { email, suggestedDisplayName?, agentName?, note?, expiresInDays? }
 * Returns: { invite: SellerInviteSnapshot }
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  let body: {
    email?: string;
    suggestedDisplayName?: string;
    agentName?: string;
    note?: string;
    expiresInDays?: number;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return apiError("email is required.", 400);
  }

  const service = getPaymentRecoveryService();

  try {
    const invite = await service.createSellerInvite({
      email,
      suggestedDisplayName: body.suggestedDisplayName?.trim(),
      agentName: body.agentName?.trim(),
      note: body.note?.trim(),
      createdByEmail: auth.email,
      expiresInDays: body.expiresInDays ?? 7,
    });

    return apiOk({ invite }, 201);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to create invite.",
      500,
    );
  }
}
