import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getUpsellService } from "@/server/recovery/services/upsell-service";

/**
 * GET /api/upsell
 * Returns upsell analytics + recent offers
 * Query: ?sellerKey=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;

  const service = getUpsellService();
  const [analytics, recentOffers] = await Promise.all([
    service.getAnalytics({ sellerKey }),
    service.listRecentOffers({ sellerKey }),
  ]);

  return NextResponse.json({ ok: true, data: { analytics, recentOffers } });
}

/**
 * POST /api/upsell
 * Body: upsell rule creation payload
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

  const service = getUpsellService();
  const rule = await service.createRule(body);

  return NextResponse.json({ ok: true, data: rule }, { status: 201 });
}
