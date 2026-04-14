import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentScoreService } from "@/server/recovery/services/payment-score-service";

/**
 * GET /api/score
 * Query: ?customerId= or ?email= or ?document=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const email = url.searchParams.get("email") ?? undefined;
  const document = url.searchParams.get("document") ?? undefined;

  if (!customerId && !email && !document) {
    return NextResponse.json(
      { error: "customerId, email, or document is required" },
      { status: 400 },
    );
  }

  const service = getPaymentScoreService();
  const score = await service.getScore({ customerId, email, document });

  return NextResponse.json({ ok: true, data: score });
}
