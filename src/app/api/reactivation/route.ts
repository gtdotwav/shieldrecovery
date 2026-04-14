import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getReactivationService } from "@/server/recovery/services/reactivation-service";
import type { CreateCampaignInput } from "@/server/recovery/services/reactivation-service";

/**
 * GET /api/reactivation
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

  const service = getReactivationService();
  const campaigns = await service.listCampaigns(sellerKey);

  return NextResponse.json({ ok: true, data: campaigns });
}

/**
 * POST /api/reactivation
 * Body: campaign creation payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateCampaignInput;
  try {
    body = (await request.json()) as CreateCampaignInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getReactivationService();
  const campaign = await service.createCampaign(body);

  return NextResponse.json({ ok: true, data: campaign }, { status: 201 });
}
