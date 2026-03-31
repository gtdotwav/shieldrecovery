import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";
import { getSellerPixAccounts } from "@/server/checkout";

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

async function resolveCheckoutOverrides(email: string) {
  const identity = await getSellerIdentityByEmail(email);
  if (!identity) return undefined;

  const storage = getStorageService();
  const allControls = await storage.getSellerAdminControls();
  const controls = allControls.find((c) => c.sellerKey === identity.agentName);
  if (!controls?.checkoutApiKey) return undefined;

  return {
    baseUrl: controls.checkoutUrl || undefined,
    apiKey: controls.checkoutApiKey,
  };
}
