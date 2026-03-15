import { handlePaymentRetry } from "@/server/recovery/controllers/payment-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handlePaymentRetry(request);
}
