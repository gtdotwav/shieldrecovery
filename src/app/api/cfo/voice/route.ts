import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getCfoAgentService } from "@/server/recovery/services/cfo-agent-service";

export async function POST(_req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const service = getCfoAgentService();
    const result = await service.generateVoiceSessionUrl();

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Voice service not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      wsUrl: result.wsUrl,
      systemPrompt: result.systemPrompt,
      firstMessage: result.firstMessage,
    });
  } catch (error) {
    console.error("[cfo/voice] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
