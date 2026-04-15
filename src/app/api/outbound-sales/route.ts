import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getOutboundSalesService } from "@/server/recovery/services/outbound-sales-service";

const createCampaignSchema = z.object({
  sellerKey: z.string().min(1),
  name: z.string().min(1),
  product: z.string().min(1),
  description: z.string().optional(),
  script: z.string().min(1),
  channel: z.enum(["voice", "whatsapp"]).optional(),
  batchSize: z.number().int().positive().optional(),
  batchIntervalMinutes: z.number().int().positive().optional(),
  contacts: z.array(
    z.object({
      customerName: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email().optional(),
    }),
  ).min(1),
});

/**
 * GET /api/outbound-sales
 * Query: ?sellerKey=&status=&limit=
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
  const status = url.searchParams.get("status") ?? undefined;
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

  const service = getOutboundSalesService();
  const campaigns = await service.listCampaigns({ sellerKey: effectiveSellerKey, status, limit });

  return NextResponse.json({ ok: true, data: campaigns });
}

/**
 * POST /api/outbound-sales
 * Body: campaign creation payload
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

  const parsed = createCampaignSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const service = getOutboundSalesService();
  const campaign = await service.createCampaign(parsed.data);

  return NextResponse.json({ ok: true, data: campaign }, { status: 201 });
}
