import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getTrackingService } from "@/server/recovery/services/tracking-service";
import type { TrackingEventType, InternalSource, UtmParams } from "@/server/recovery/services/tracking-service";

/**
 * Tracking pixel / event endpoint.
 * Called by the JS pixel or server-side to record tracking events.
 *
 * POST /api/tracking/event
 * Body: { seller_key, event_type, utm_*, session_id, visitor_id, ... }
 *
 * Also supports GET with query params (for img pixel fallback).
 */

const VALID_EVENT_TYPES = new Set<TrackingEventType>([
  "page_view", "link_click", "checkout_start",
  "payment_completed", "recovery_completed",
  "cart_recovered", "upsell_accepted",
  "reactivation_completed", "subscription_renewed",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sellerKey = (body.seller_key || body.sk || "").trim();
    const eventType = (body.event_type || body.et || "page_view") as string;

    if (!sellerKey) {
      return NextResponse.json({ error: "seller_key required" }, { status: 400, headers: CORS_HEADERS });
    }

    if (!VALID_EVENT_TYPES.has(eventType as TrackingEventType)) {
      return NextResponse.json({ error: "invalid event_type" }, { status: 400, headers: CORS_HEADERS });
    }

    const utm: UtmParams = {
      utm_source: body.utm_source || body.us || undefined,
      utm_medium: body.utm_medium || body.um || undefined,
      utm_campaign: body.utm_campaign || body.uc || undefined,
      utm_content: body.utm_content || body.ux || undefined,
      utm_term: body.utm_term || body.ut || undefined,
    };

    const service = getTrackingService();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || undefined;

    const eventId = await service.recordEvent({
      sellerKey,
      eventType: eventType as TrackingEventType,
      utm,
      sessionId: body.session_id || body.sid || undefined,
      visitorId: body.visitor_id || body.vid || undefined,
      customerId: body.customer_id || undefined,
      paymentId: body.payment_id || undefined,
      leadId: body.lead_id || undefined,
      linkId: body.link_id || undefined,
      campaignId: body.campaign_id || undefined,
      referrerUrl: body.referrer || undefined,
      landingPage: body.page || body.landing_page || undefined,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      revenueCents: body.revenue_cents || 0,
      internalSource: body.internal_source as InternalSource | undefined,
      internalSourceId: body.internal_source_id || undefined,
      metadata: body.metadata || {},
    });

    return NextResponse.json({ ok: true, id: eventId }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[tracking/event] Error:", error);
    return NextResponse.json({ error: "tracking error" }, { status: 500, headers: CORS_HEADERS });
  }
}

/** GET /api/tracking/event?sk=...&et=page_view&us=... (img pixel fallback) */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sellerKey = (sp.get("sk") || sp.get("seller_key") || "").trim();
  const eventType = (sp.get("et") || sp.get("event_type") || "page_view") as string;

  if (sellerKey && VALID_EVENT_TYPES.has(eventType as TrackingEventType)) {
    const service = getTrackingService();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || undefined;

    await service.recordEvent({
      sellerKey,
      eventType: eventType as TrackingEventType,
      utm: {
        utm_source: sp.get("us") || sp.get("utm_source") || undefined,
        utm_medium: sp.get("um") || sp.get("utm_medium") || undefined,
        utm_campaign: sp.get("uc") || sp.get("utm_campaign") || undefined,
        utm_content: sp.get("ux") || sp.get("utm_content") || undefined,
        utm_term: sp.get("ut") || sp.get("utm_term") || undefined,
      },
      sessionId: sp.get("sid") || undefined,
      visitorId: sp.get("vid") || undefined,
      referrerUrl: sp.get("ref") || undefined,
      landingPage: sp.get("page") || undefined,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new NextResponse(pixel, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "image/gif",
    },
  });
}
