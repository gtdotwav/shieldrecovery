import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getRecurringBillingService } from "@/server/recovery/services/recurring-billing-service";

/**
 * GET /api/subscriptions/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const service = getRecurringBillingService();
  const all = await service.listSubscriptions();
  const subscription = all.find((s) => s.id === id);

  if (!subscription) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: subscription });
}

/**
 * PATCH /api/subscriptions/[id]
 * Body: { action: "cancel" | "pause" | "resume", reason?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: string; reason?: string };
  try {
    body = await request.json() as { action?: string; reason?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getRecurringBillingService();

  switch (body.action) {
    case "cancel": {
      const result = await service.cancelSubscription(id, body.reason);
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, data: result });
    }
    case "pause": {
      const result = await service.pauseSubscription(id);
      if (!result) return NextResponse.json({ error: "Not found or not pausable" }, { status: 404 });
      return NextResponse.json({ ok: true, data: result });
    }
    case "resume": {
      const result = await service.resumeSubscription(id);
      if (!result) return NextResponse.json({ error: "Not found or not paused" }, { status: 404 });
      return NextResponse.json({ ok: true, data: result });
    }
    default:
      return NextResponse.json(
        { error: "Invalid action. Expected 'cancel', 'pause', or 'resume'." },
        { status: 400 },
      );
  }
}
