import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export async function handleRecoveryAnalytics() {
  return NextResponse.json(await getPaymentRecoveryService().getRecoveryAnalytics(), {
    status: 200,
  });
}
