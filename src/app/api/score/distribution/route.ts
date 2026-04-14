import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentScoreService } from "@/server/recovery/services/payment-score-service";

/**
 * GET /api/score/distribution
 * Query: ?sellerKey=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;

  const service = getPaymentScoreService();
  const distribution = await service.getScoreDistribution(sellerKey);

  return NextResponse.json({ ok: true, data: distribution });
}
