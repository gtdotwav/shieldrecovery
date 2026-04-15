import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getCommerceAIService } from "@/server/recovery/services/commerce-ai-service";

/**
 * GET /api/commerce/catalog
 * Query: ?sellerKey= (required)
 */
export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "seller") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  let effectiveSellerKey = url.searchParams.get("sellerKey");

  if (session.role === "seller") {
    const identity = await getSellerIdentityByEmail(session.email);
    if (!identity) {
      return NextResponse.json({ error: "Seller not found" }, { status: 403 });
    }
    effectiveSellerKey = identity.agentName;
  }

  if (!effectiveSellerKey) {
    return NextResponse.json(
      { error: "sellerKey is required" },
      { status: 400 },
    );
  }

  const service = getCommerceAIService();
  const catalog = await service.getCatalog(effectiveSellerKey);

  return NextResponse.json({ ok: true, data: catalog });
}

/**
 * POST /api/commerce/catalog
 * Body: catalog update payload
 */
export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
