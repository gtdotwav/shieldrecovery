import { handlePaymentRetry } from "@/server/recovery/controllers/payment-controller";
import { markAsLegacyRoute } from "@/server/recovery/controllers/route-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return markAsLegacyRoute(
    await handlePaymentRetry(request),
    "/api/payments/retry",
  );
}
