import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getReactivationService } from "@/server/recovery/services/reactivation-service";

/**
 * GET /api/reactivation/[id]
 * Returns campaign details + analytics for the given campaign.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const service = getReactivationService();
  const all = await service.listCampaigns();
  const campaign = all.find((c) => c.id === id);

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const analytics = await service.getCampaignAnalytics(id);

  return NextResponse.json({ ok: true, data: { campaign, analytics } });
}

/**
 * PATCH /api/reactivation/[id]
 * Body: { action: "start" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await request.json() as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getReactivationService();

  switch (body.action) {
    case "start": {
      const result = await service.startCampaign(id);
      return NextResponse.json({ ok: true, data: result });
    }
    default:
      return NextResponse.json(
        { error: "Invalid action. Expected 'start'." },
        { status: 400 },
      );
  }
}
