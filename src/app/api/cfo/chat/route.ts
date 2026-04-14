import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getCfoAgentService, type CfoSellerContext } from "@/server/recovery/services/cfo-agent-service";

async function resolveSellerContext(session: { email: string; role: string }): Promise<CfoSellerContext> {
  const ctx: CfoSellerContext = { email: session.email, role: session.role };

  if (session.role === "seller") {
    const identity = await getSellerIdentityByEmail(session.email);
    if (identity) {
      ctx.sellerAgentName = identity.agentName;
      ctx.sellerDisplayName = identity.displayName;
      ctx.sellerKey = identity.agentName;
    }
  }

  return ctx;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ctx = await resolveSellerContext(session);
    const body = await req.json();
    const { message, conversationId, chipId } = body as {
      message?: string;
      conversationId?: string;
      chipId?: string;
    };

    const service = getCfoAgentService();

    // Quick action chip — scoped to seller
    if (chipId) {
      const reply = await service.processQuickAction(chipId as any, ctx);
      return NextResponse.json({ ok: true, reply, conversationId: conversationId || null });
    }

    // Free-form chat — scoped to seller
    if (!message) {
      return NextResponse.json({ ok: false, error: "Message required" }, { status: 400 });
    }

    const result = await service.chat(message, ctx, conversationId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cfo/chat] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId required" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, messages: [] });
  } catch (error) {
    console.error("[cfo/chat] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
