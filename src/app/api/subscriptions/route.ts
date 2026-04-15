import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getRecurringBillingService } from "@/server/recovery/services/recurring-billing-service";

const createSubscriptionSchema = z.object({
  sellerKey: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email(),
  planName: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().optional(),
  intervalDays: z.number().int().positive(),
  nextDueDate: z.string().min(1),
});

/**
 * GET /api/subscriptions
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
  const status = url.searchParams.get("status") ?? undefined;
  const limit = url.searchParams.get("limit")
    ? Number(url.searchParams.get("limit"))
    : undefined;

  if (session.role === "seller") {
    const identity = await getSellerIdentityByEmail(session.email);
    if (!identity) {
      return NextResponse.json({ error: "Seller not found" }, { status: 403 });
    }
    effectiveSellerKey = identity.agentName;
  }

  const service = getRecurringBillingService();
  const subscriptions = await service.listSubscriptions(
    effectiveSellerKey,
    status as "active" | "paused" | "canceled" | "past_due" | undefined,
    limit,
  );

  return NextResponse.json({ ok: true, data: subscriptions });
}

/**
 * POST /api/subscriptions
 * Body: subscription creation payload
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

  const parsed = createSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const service = getRecurringBillingService();
  const subscription = await service.createSubscription(parsed.data);

  return NextResponse.json({ ok: true, data: subscription }, { status: 201 });
}
