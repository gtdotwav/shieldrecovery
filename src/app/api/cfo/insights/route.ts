import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getCfoAgentService } from "@/server/recovery/services/cfo-agent-service";
import { getSellerIdentityByEmail } from "@/server/auth/identities";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 10), 100);

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
    console.error("[cfo/insights] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { insightId } = body as { insightId: string };

    if (!insightId) {
      return NextResponse.json({ ok: false, error: "insightId required" }, { status: 400 });
    }

    const service = getCfoAgentService();
    await service.markInsightRead(insightId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cfo/insights] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
