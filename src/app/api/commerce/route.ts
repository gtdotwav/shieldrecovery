import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getCommerceAIService } from "@/server/recovery/services/commerce-ai-service";

const createSessionSchema = z.object({
  sellerKey: z.string().min(1),
  customerPhone: z.string().min(1),
  customerName: z.string().optional(),
});

/**
 * GET /api/commerce
 * Returns commerce sessions + analytics
 * Query: ?sellerKey=&limit=
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
  let effectiveSellerKey = url.searchParams.get("sellerKey") ?? undefined;
  const limit = url.searchParams.get("limit")
    ? Number(url.searchParams.get("limit"))
    : undefined;

  if (session.role === "seller") {
    const identity = await getSellerIdentityByEmail(session.email);
    if (!identity) {
      return NextResponse.json({ error: "Seller not found" }, { status: 403 });
    }
    effectiveSellerKey = identity.agentName;
  }

  const service = getCommerceAIService();
  const [sessions, analytics] = await Promise.all([
    service.listSessions({ sellerKey: effectiveSellerKey, limit }),
    service.getAnalytics({ sellerKey: effectiveSellerKey }),
  ]);

  return NextResponse.json({ ok: true, data: { sessions, analytics } });
}

/**
 * POST /api/commerce
 * Body: new commerce session payload
 */
export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const service = getCommerceAIService();
  const created = await service.createSession(parsed.data);

  return NextResponse.json({ ok: true, data: created }, { status: 201 });
}
