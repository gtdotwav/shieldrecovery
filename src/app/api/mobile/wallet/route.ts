import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getSellerWallet } from "@/server/checkout";
import { resolveCheckoutOverrides } from "@/server/checkout-overrides";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/mobile/wallet
 * Returns seller wallet: { available, pending, totalReceived, totalFees }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const overrides = await resolveCheckoutOverrides(auth.email);
    const wallet = await getSellerWallet(overrides);
    return apiOk(wallet);
  } catch (err) {
    console.error("[mobile/wallet]", err);
    return apiError("Failed to load wallet", 500);
  }
}
