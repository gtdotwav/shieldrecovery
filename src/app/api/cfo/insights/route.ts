import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getCfoAgentService } from "@/server/recovery/services/cfo-agent-service";
import { getSellerIdentityByEmail } from "@/server/auth/identities";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
    const { searchParams } = req.nextUrl;
    const limit = Number(searchParams.get("limit")) || 10;

    const service = getCfoAgentService();

    let sellerKey: string | undefined;
    if (session.role === "seller") {
      const identity = await getSellerIdentityByEmail(session.email);
      sellerKey = identity?.agentName;
    }

    const [insights, unreadCount] = await Promise.all([
      service.listInsights(sellerKey, limit),
      service.getUnreadInsightsCount(sellerKey),
    ]);

    return NextResponse.json({ ok: true, insights, unreadCount });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller", "market"]);
    const body = await req.json();
    const { insightId } = body as { insightId: string };

    if (!insightId) {
      return NextResponse.json({ ok: false, error: "insightId required" }, { status: 400 });
    }

    const service = getCfoAgentService();
    await service.markInsightRead(insightId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
