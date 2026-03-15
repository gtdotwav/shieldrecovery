import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { HttpError } from "@/server/recovery/utils/http-error";

export async function handleShieldTransactionImport(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await getPaymentRecoveryService().importShieldTransactionPayload(rawBody);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected import error.",
        details: error instanceof HttpError ? error.details ?? null : null,
      },
      { status: statusCode },
    );
  }
}
