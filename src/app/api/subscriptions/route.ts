import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getRecurringBillingService } from "@/server/recovery/services/recurring-billing-service";
import type { CreateSubscriptionInput } from "@/server/recovery/services/recurring-billing-service";

/**
 * GET /api/subscriptions
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

  const service = getRecurringBillingService();
  const subscriptions = await service.listSubscriptions(
    sellerKey,
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
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateSubscriptionInput;
  try {
    body = await request.json() as CreateSubscriptionInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getRecurringBillingService();
  const subscription = await service.createSubscription(body);

  return NextResponse.json({ ok: true, data: subscription }, { status: 201 });
}
