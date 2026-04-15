import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getReactivationService } from "@/server/recovery/services/reactivation-service";
import type { CreateCampaignInput } from "@/server/recovery/services/reactivation-service";

/**
 * GET /api/reactivation
 * Query: ?sellerKey=&status=&limit=
 */
export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "seller") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  let effectiveSellerKey = url.searchParams.get("sellerKey") ?? undefined;

  if (session.role === "seller") {
    const identity = await getSellerIdentityByEmail(session.email);
    if (!identity) {
      return NextResponse.json({ error: "Seller not found" }, { status: 403 });
    }
    effectiveSellerKey = identity.agentName;
  }

  const service = getReactivationService();
  const campaigns = await service.listCampaigns(effectiveSellerKey);

  return NextResponse.json({ ok: true, data: campaigns });
}

/**
 * POST /api/reactivation
 * Body: campaign creation payload
 */
export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
