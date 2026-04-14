import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getRecurringBillingService } from "@/server/recovery/services/recurring-billing-service";

/**
 * GET /api/subscriptions/invoices
 * Query: ?subscriptionId=&status=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get("subscriptionId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const service = getRecurringBillingService();
  const invoices = await service.listInvoices(
    subscriptionId,
    status as "pending" | "paid" | "failed" | "void" | undefined,
  );

  return NextResponse.json({ ok: true, data: invoices });
}
