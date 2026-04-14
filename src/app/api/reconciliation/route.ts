import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getReconciliationService } from "@/server/recovery/services/reconciliation-service";

/**
 * GET /api/reconciliation
 * Query: ?sellerKey=&status=&limit=
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;

  const service = getReconciliationService();
  const reports = await service.listReports(sellerKey);

  return NextResponse.json({ ok: true, data: reports });
}

/**
 * POST /api/reconciliation
 * Body: report generation payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sellerKey: string; periodStart: string; periodEnd: string };
  try {
    body = await request.json() as { sellerKey: string; periodStart: string; periodEnd: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getReconciliationService();
  const report = await service.generateReport(body.sellerKey, body.periodStart, body.periodEnd);

  return NextResponse.json({ ok: true, data: report }, { status: 201 });
}
