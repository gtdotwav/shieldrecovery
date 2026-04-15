import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getTrackingService } from "@/server/recovery/services/tracking-service";

/**
 * GET /api/tracking/analytics?days=30
 *
 * Returns tracking analytics (ROAS, CPA, conversions, channel breakdown).
 * Scoped to seller if not admin.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedSession(["admin", "seller"]);
    let sellerKey: string | undefined;

    if (session.role === "seller") {
      const identity = await getSellerIdentityByEmail(session.email);
      sellerKey = identity?.agentName;
    }

    const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));

    const service = getTrackingService();
    const analytics = await service.getAnalytics(sellerKey, days);

    return NextResponse.json({ analytics });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[tracking/analytics] Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
