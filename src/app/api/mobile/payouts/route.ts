import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";
import { getSellerPayouts, requestSellerPayout } from "@/server/checkout";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/mobile/payouts
 * Returns seller payouts: { payouts: Payout[] }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const overrides = await resolveCheckoutOverrides(auth.email);
    const payouts = await getSellerPayouts(overrides);
    return apiOk(payouts);
  } catch (err) {
    console.error("[mobile/payouts]", err);
    return apiError("Failed to load payouts", 500);
  }
}

/**
 * POST /api/mobile/payouts
 * Body: { amount: number, pixAccountId: string }
 * Request a payout via PIX.
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const pixAccountId = String(body.pixAccountId || "");

    if (!amount || amount <= 0) {
      return apiError("Valor invalido", 400);
    }
    if (!pixAccountId) {
      return apiError("Conta PIX obrigatoria", 400);
    }

    const overrides = await resolveCheckoutOverrides(auth.email);
    if (!overrides) {
      return apiError("Checkout nao configurado para este vendedor", 400);
    }

    const result = await requestSellerPayout(amount, pixAccountId, overrides);
    return apiOk(result);
  } catch (err) {
    console.error("[mobile/payouts POST]", err);
    return apiError(
      err instanceof Error ? err.message : "Erro ao solicitar saque",
      500,
    );
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
