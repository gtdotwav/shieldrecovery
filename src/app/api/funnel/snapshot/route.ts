import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFunnelService } from "@/server/recovery/services/funnel-service";

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a.padEnd(64, "\0"));
  const bufB = Buffer.from(b.padEnd(64, "\0"));
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token || !constantTimeEqual(token, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const funnel = getFunnelService();
  const today = new Date().toISOString().split("T")[0];

  try {
    const snapshot = await funnel.buildDailySnapshot({ date: today });
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("[funnel/snapshot]", error);
    return NextResponse.json(
      { error: "Failed to build snapshot" },
      { status: 500 },
    );
  }
}
