import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getCartAbandonmentService } from "@/server/recovery/services/cart-abandonment-service";

/**
 * GET /api/cart-abandonment
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

  const service = getCartAbandonmentService();
  const abandonments = await service.listAbandonments(
    sellerKey,
    status as "pending" | "contacted" | "recovered" | "expired" | undefined,
    limit,
  );

  return NextResponse.json({ ok: true, data: abandonments });
}
