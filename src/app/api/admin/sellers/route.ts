import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { hashPlatformPassword } from "@/server/auth/passwords";

export function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/admin/sellers
 * Body: { email, displayName?, agentName, password?, active? }
 * Returns: { seller: SellerUserSnapshot }
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  let body: {
    email?: string;
    displayName?: string;
    agentName?: string;
    password?: string;
    active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const agentName = body.agentName?.trim() ?? "";

  if (!email || !agentName) {
    return apiError("email and agentName are required.", 400);
  }

  const existing = await getStorageService().findSellerUserByEmail(email);
  const passwordHash = body.password
    ? hashPlatformPassword(body.password.trim())
    : existing?.passwordHash ?? "";

  if (!existing && !body.password) {
    return apiError("password is required for new sellers.", 400);
  }

  const service = getPaymentRecoveryService();

  try {
    const seller = await service.saveSellerUser({
      email,
      displayName: body.displayName?.trim() ?? agentName,
      agentName,
      passwordHash,
      active: body.active ?? true,
    });

    await service.saveSellerAdminControl({
      sellerKey: agentName.toLowerCase().replace(/\s+/g, "-"),
      sellerName: agentName,
      sellerEmail: email,
      active: body.active ?? true,
    });

    return apiOk({ seller }, 201);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to save seller.",
      500,
    );
  }
}
