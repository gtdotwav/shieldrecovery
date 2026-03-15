import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handlePaymentRetry } from "@/server/recovery/controllers/payment-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return handlePaymentRetry(request);
}
