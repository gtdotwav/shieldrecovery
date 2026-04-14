import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getOutboundSalesService } from "@/server/recovery/services/outbound-sales-service";

/**
 * GET /api/outbound-sales
 * Query: ?sellerKey=&status=&limit=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const limit = url.searchParams.get("limit")
    ? Number(url.searchParams.get("limit"))
    : undefined;

  const service = getOutboundSalesService();
  const campaigns = await service.listCampaigns({ sellerKey, status, limit });

  return NextResponse.json({ ok: true, data: campaigns });
}

/**
 * POST /api/outbound-sales
 * Body: campaign creation payload
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

  const service = getOutboundSalesService();
  const campaign = await service.createCampaign(body);

  return NextResponse.json({ ok: true, data: campaign }, { status: 201 });
}
