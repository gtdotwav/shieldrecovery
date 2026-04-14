import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getAnticipationService } from "@/server/recovery/services/anticipation-service";
import type { RequestStatus } from "@/server/recovery/services/anticipation-service";

/**
 * GET /api/anticipation
 * Returns anticipation requests + available receivables
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

  const service = getAnticipationService();
  const [requests, receivables] = await Promise.all([
    service.listRequests(sellerKey, status as RequestStatus | undefined),
    sellerKey ? service.getAvailableReceivables(sellerKey) : Promise.resolve(null),
  ]);

  return NextResponse.json({ ok: true, data: { requests, receivables } });
}

/**
 * POST /api/anticipation
 * Body: anticipation request payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sellerKey: string; amount: number };
  try {
    body = await request.json() as { sellerKey: string; amount: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getAnticipationService();
  const anticipation = await service.requestAnticipation(body.sellerKey, body.amount);

  return NextResponse.json({ ok: true, data: anticipation }, { status: 201 });
}
