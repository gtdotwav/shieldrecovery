import { z } from "zod";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

const inviteSchema = z.object({
  email: z.string().email("email is required.").min(1).max(255),
  suggestedDisplayName: z.string().min(1).max(255).optional(),
  agentName: z.string().min(1).max(255).optional(),
  note: z.string().min(1).max(255).optional(),
  expiresInDays: z.number().int().min(1).optional(),
});

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body.", 400);
  }

  const email = parsed.data.email.trim().toLowerCase();

  const service = getPaymentRecoveryService();

  try {
    const invite = await service.createSellerInvite({
      email,
      suggestedDisplayName: parsed.data.suggestedDisplayName?.trim(),
      agentName: parsed.data.agentName?.trim(),
      note: parsed.data.note?.trim(),
      createdByEmail: auth.email,
      expiresInDays: parsed.data.expiresInDays ?? 7,
    });

    return apiOk({ invite }, 201);
  } catch (error) {
    console.error("[POST /api/admin/invites]", error instanceof Error ? error.message : error);
    return apiError("Failed to create invite.", 500);
  }
}
