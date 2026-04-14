import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getNegativationService } from "@/server/recovery/services/negativation-service";
import type { CreateNegativationInput, NegativationStatus } from "@/server/recovery/services/negativation-service";

/**
 * GET /api/negativation
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
  const status = url.searchParams.get("status") ?? undefined;

  const service = getNegativationService();
  const negativations = await service.listNegativations(
    sellerKey,
    status as NegativationStatus | undefined,
  );

  return NextResponse.json({ ok: true, data: negativations });
}

/**
 * POST /api/negativation
 * Body: negativation creation payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateNegativationInput;
  try {
    body = await request.json() as CreateNegativationInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getNegativationService();
  const negativation = await service.createNegativation(body);

  return NextResponse.json({ ok: true, data: negativation }, { status: 201 });
}
