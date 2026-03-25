import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export async function handleRecoveryAnalytics() {
  try {
    return NextResponse.json(await getPaymentRecoveryService().getRecoveryAnalytics(), {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics unavailable.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
