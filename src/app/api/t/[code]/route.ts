import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getTrackingService } from "@/server/recovery/services/tracking-service";

/**
 * GET /api/t/[code]
 *
 * Short link redirect with tracking.
 * Resolves the short code, records a link_click event, and redirects
 * to the destination URL with UTM parameters appended.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!code || code.length > 32) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  const service = getTrackingService();
  const link = await service.resolveShortLink(code);

  if (!link) {
    return NextResponse.json({ error: "link not found or expired" }, { status: 404 });
  }

  // Build destination URL with UTM params
  const utmSource = link.utmSource ?? undefined;
  const utmMedium = link.utmMedium ?? undefined;
  const utmCampaign = link.utmCampaign ?? undefined;
  const utmContent = link.utmContent ?? undefined;
  const utmTerm = link.utmTerm ?? undefined;

  // If link has no UTM but has a campaign, inherit from campaign
  let effectiveUtm = { utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign, utm_content: utmContent, utm_term: utmTerm };

  if (!utmSource && link.campaignId) {
    const campaign = await service.getCampaign(link.campaignId);
    if (campaign) {
      effectiveUtm = {
        utm_source: campaign.utmSource,
        utm_medium: campaign.utmMedium,
        utm_campaign: campaign.utmCampaign,
        utm_content: campaign.utmContent,
        utm_term: campaign.utmTerm,
      };
    }
  }

  const redirectUrl = service.buildTrackedUrl(link.destinationUrl, effectiveUtm);

  // Extract visitor/session from cookies for attribution
  const visitorId = req.cookies.get("_pgr_vid")?.value;

  // Record click event (fire and forget)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || undefined;

  service.recordEvent({
    sellerKey: link.sellerKey,
    eventType: "link_click",
    utm: effectiveUtm,
    visitorId,
    linkId: link.id,
    campaignId: link.campaignId,
    referrerUrl: req.headers.get("referer") || undefined,
    landingPage: link.destinationUrl,
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") || undefined,
  }).catch(() => {});

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
