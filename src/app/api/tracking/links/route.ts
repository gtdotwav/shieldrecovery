import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getTrackingService } from "@/server/recovery/services/tracking-service";

/**
 * GET /api/tracking/links — List tracking links (scoped by seller)
 * POST /api/tracking/links — Create a new short tracking link
 */

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedSession(["admin", "seller"]);
    let sellerKey: string | undefined;

    if (session.role === "seller") {
      const identity = await getSellerIdentityByEmail(session.email);
      sellerKey = identity?.agentName;
    }

    const campaignId = req.nextUrl.searchParams.get("campaign_id") || undefined;

    const service = getTrackingService();
    const links = await service.listLinks(sellerKey, campaignId);

    return NextResponse.json({ links });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list links" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthenticatedSession(["admin", "seller"]);

    const body = await req.json();
    const { destination_url, campaign_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, label, expires_at } = body;

    if (!destination_url) {
      return NextResponse.json({ error: "destination_url is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(destination_url);
    } catch {
      return NextResponse.json({ error: "invalid destination_url" }, { status: 400 });
    }

    let sellerKey: string;
    if (session.role === "seller") {
      const identity = await getSellerIdentityByEmail(session.email);
      sellerKey = identity?.agentName ?? "";
    } else {
      sellerKey = body.seller_key || "admin";
    }

    const service = getTrackingService();
    const link = await service.createLink({
      sellerKey,
      campaignId: campaign_id || undefined,
      destinationUrl: String(destination_url).slice(0, 2000),
      utmSource: utm_source ? String(utm_source).slice(0, 100) : undefined,
      utmMedium: utm_medium ? String(utm_medium).slice(0, 100) : undefined,
      utmCampaign: utm_campaign ? String(utm_campaign).slice(0, 200) : undefined,
      utmContent: utm_content ? String(utm_content).slice(0, 200) : undefined,
      utmTerm: utm_term ? String(utm_term).slice(0, 200) : undefined,
      label: label ? String(label).slice(0, 200) : undefined,
      expiresAt: expires_at || undefined,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[tracking/links] Error:", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}
