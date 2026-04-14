import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPreventiveBillingService } from "@/server/recovery/services/preventive-billing-service";
import type { CreatePreventiveRuleInput } from "@/server/recovery/services/preventive-billing-service";

/**
 * GET /api/preventive-billing
 * Returns preventive rules + analytics
 * Query: ?sellerKey=&active=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;

  const service = getPreventiveBillingService();
  const [rules, analytics] = await Promise.all([
    service.listRules(sellerKey),
    service.getPreventiveAnalytics(sellerKey),
  ]);

  return NextResponse.json({ ok: true, data: { rules, analytics } });
}

/**
 * POST /api/preventive-billing
 * Body: preventive rule creation payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePreventiveRuleInput;
  try {
    body = await request.json() as CreatePreventiveRuleInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getPreventiveBillingService();
  const rule = await service.createRule(body);

  return NextResponse.json({ ok: true, data: rule }, { status: 201 });
}
