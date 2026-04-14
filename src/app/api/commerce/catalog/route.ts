import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getCommerceAIService } from "@/server/recovery/services/commerce-ai-service";

/**
 * GET /api/commerce/catalog
 * Query: ?sellerKey= (required)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sellerKey = url.searchParams.get("sellerKey");

  if (!sellerKey) {
    return NextResponse.json(
      { error: "sellerKey is required" },
      { status: 400 },
    );
  }

  const service = getCommerceAIService();
  const catalog = await service.getCatalog(sellerKey);

  return NextResponse.json({ ok: true, data: catalog });
}

/**
 * POST /api/commerce/catalog
 * Body: catalog update payload
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getCommerceAIService();
  const catalog = await service.updateCatalog(body);

  return NextResponse.json({ ok: true, data: catalog });
}

/**
 * PUT /api/commerce/catalog
 * Body: full catalog replacement payload
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getCommerceAIService();
  const catalog = await service.updateCatalog(body);

  return NextResponse.json({ ok: true, data: catalog });
}
