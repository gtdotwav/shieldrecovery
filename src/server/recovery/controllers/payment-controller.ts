import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { HttpError } from "@/server/recovery/utils/http-error";

export async function handlePaymentRetry(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await getPaymentRecoveryService().createPaymentRetry(
      {
        payment_id:
          typeof payload.payment_id === "string" ? payload.payment_id : undefined,
        gateway_payment_id:
          typeof payload.gateway_payment_id === "string"
            ? payload.gateway_payment_id
            : undefined,
        order_id: typeof payload.order_id === "string" ? payload.order_id : undefined,
        reason: typeof payload.reason === "string" ? payload.reason : undefined,
      },
      new URL(request.url).origin,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    console.error("[handlePaymentRetry]", error instanceof Error ? error.message : error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof HttpError
          ? error.message
          : "Erro ao processar tentativa de pagamento.",
        details: error instanceof HttpError ? error.details ?? null : null,
      },
      { status: statusCode },
    );
  }
}
