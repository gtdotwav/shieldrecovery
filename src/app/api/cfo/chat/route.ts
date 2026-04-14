import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getCfoAgentService } from "@/server/recovery/services/cfo-agent-service";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
    const body = await req.json();
    const { message, conversationId, chipId } = body as {
      message?: string;
      conversationId?: string;
      chipId?: string;
    };

    const service = getCfoAgentService();

    // Quick action chip
    if (chipId) {
      const reply = await service.processQuickAction(chipId as any);
      return NextResponse.json({ ok: true, reply, conversationId: conversationId || null });
    }

    // Free-form chat
    if (!message) {
      return NextResponse.json({ ok: false, error: "Message required" }, { status: 400 });
    }

    const result = await service.chat(message, conversationId, session.email, session.role);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller", "market"]);
    const { searchParams } = req.nextUrl;
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId required" }, { status: 400 });
    }

    // For now return empty — conversation history stored in client state
    return NextResponse.json({ ok: true, messages: [] });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
