import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getCommerceAIService } from "@/server/recovery/services/commerce-ai-service";

/**
 * GET /api/commerce
 * Returns commerce sessions + analytics
 * Query: ?sellerKey=&limit=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;
  const limit = url.searchParams.get("limit")
    ? Number(url.searchParams.get("limit"))
    : undefined;

  const service = getCommerceAIService();
  const [sessions, analytics] = await Promise.all([
    service.listSessions({ sellerKey, limit }),
    service.getAnalytics({ sellerKey }),
  ]);

  return NextResponse.json({ ok: true, data: { sessions, analytics } });
}

/**
 * POST /api/commerce
 * Body: new commerce session payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getCommerceAIService();
  const session = await service.createSession(body);

  return NextResponse.json({ ok: true, data: session }, { status: 201 });
}
