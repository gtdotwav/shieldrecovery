import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";
import { getSellerSplits } from "@/server/checkout";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/mobile/splits?page=1
 * Returns seller splits: { entries: SplitEntry[], total: number }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const overrides = await resolveCheckoutOverrides(auth.email);
    const splits = await getSellerSplits(page, overrides);
    return apiOk(splits);
  } catch (err) {
    console.error("[mobile/splits]", err);
    return apiError("Failed to load splits", 500);
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
