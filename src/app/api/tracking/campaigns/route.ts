import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getTrackingService } from "@/server/recovery/services/tracking-service";

/**
 * GET /api/tracking/campaigns — List tracking campaigns (scoped by seller)
 * POST /api/tracking/campaigns — Create a new tracking campaign
 */

export async function GET() {
  try {
    const session = await requireAuthenticatedSession(["admin", "seller"]);
    let sellerKey: string | undefined;

    if (session.role === "seller") {
      const identity = await getSellerIdentityByEmail(session.email);
      sellerKey = identity?.agentName;
    }

    const service = getTrackingService();
    const campaigns = await service.listCampaigns(sellerKey);

    return NextResponse.json({ campaigns });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthenticatedSession(["admin", "seller"]);

    const body = await req.json();
    const { name, utm_source, utm_medium, utm_campaign, utm_content, utm_term, cost_cents } = body;

    if (!name || !utm_source || !utm_medium || !utm_campaign) {
      return NextResponse.json(
        { error: "name, utm_source, utm_medium, and utm_campaign are required" },
        { status: 400 },
      );
    }

    let sellerKey: string;
    if (session.role === "seller") {
      const identity = await getSellerIdentityByEmail(session.email);
      sellerKey = identity?.agentName ?? "";
    } else {
      sellerKey = body.seller_key || "admin";
    }

    const service = getTrackingService();
    const campaign = await service.createCampaign({
      sellerKey,
      name: String(name).slice(0, 200),
      utmSource: String(utm_source).slice(0, 100),
      utmMedium: String(utm_medium).slice(0, 100),
      utmCampaign: String(utm_campaign).slice(0, 200),
      utmContent: utm_content ? String(utm_content).slice(0, 200) : undefined,
      utmTerm: utm_term ? String(utm_term).slice(0, 200) : undefined,
      costCents: Math.max(0, Number(cost_cents) || 0),
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[tracking/campaigns] Error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
