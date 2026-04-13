import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getSellerPayouts, requestSellerPayout } from "@/server/checkout";
import { resolveCheckoutOverrides } from "@/server/checkout-overrides";
import { notifyPayoutCompleted } from "@/server/push-notifications";

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

    if (!Number.isFinite(amount) || amount <= 0) {
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

    // Push notification for payout request
    notifyPayoutCompleted(auth.email, amount).catch((err) =>
      console.error("[push] payout notify error:", err),
    );

    return apiOk(result);
  } catch (err) {
    console.error("[mobile/payouts POST]", err);
    return apiError(
      err instanceof Error ? err.message : "Erro ao solicitar saque",
      500,
    );
  }
}
