import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getRecurringBillingService } from "@/server/recovery/services/recurring-billing-service";
import type { CreateDunningRuleInput } from "@/server/recovery/services/recurring-billing-service";

/**
 * GET /api/subscriptions/dunning
 * Query: ?sellerKey=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;

  const service = getRecurringBillingService();
  const rules = await service.listDunningRules(sellerKey);

  return NextResponse.json({ ok: true, data: rules });
}

/**
 * POST /api/subscriptions/dunning
 * Body: dunning rule creation payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateDunningRuleInput;
  try {
    body = await request.json() as CreateDunningRuleInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getRecurringBillingService();
  const rule = await service.createDunningRule(body);

  return NextResponse.json({ ok: true, data: rule }, { status: 201 });
}
