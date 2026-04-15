import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getUpsellService } from "@/server/recovery/services/upsell-service";

const createRuleSchema = z.object({
  sellerKey: z.string().optional(),
  trigger: z.enum(["post_payment", "post_recovery", "post_checkout", "manual"]),
  sourceProduct: z.string().optional(),
  offerProduct: z.string().min(1),
  offerDescription: z.string().min(1),
  discountPercent: z.number().min(0).max(100).optional(),
  checkoutUrl: z.string().url(),
  priority: z.number().int().optional(),
  maxOffersPerCustomer: z.number().int().positive().optional(),
});

/**
 * GET /api/upsell
 * Returns upsell analytics + recent offers
 * Query: ?sellerKey=
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

  const service = getUpsellService();
  const [analytics, recentOffers] = await Promise.all([
    service.getAnalytics({ sellerKey: effectiveSellerKey }),
    service.listRecentOffers({ sellerKey: effectiveSellerKey }),
  ]);

  return NextResponse.json({ ok: true, data: { analytics, recentOffers } });
}

/**
 * POST /api/upsell
 * Body: upsell rule creation payload
 */
export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createRuleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const service = getUpsellService();
  const rule = await service.createRule(parsed.data);

  return NextResponse.json({ ok: true, data: rule }, { status: 201 });
}
