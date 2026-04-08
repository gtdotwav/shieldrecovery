import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getSellerPixAccounts } from "@/server/checkout";
import { resolveCheckoutOverrides } from "@/server/checkout-overrides";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/mobile/pix-accounts
 * Returns seller PIX accounts: { accounts: PixAccount[] }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const overrides = await resolveCheckoutOverrides(auth.email);
    const accounts = await getSellerPixAccounts(overrides);
    return apiOk(accounts);
  } catch (err) {
    console.error("[mobile/pix-accounts]", err);
    return apiError("Failed to load PIX accounts", 500);
  }
}
