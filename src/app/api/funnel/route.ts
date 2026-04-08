import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getFunnelService } from "@/server/recovery/services/funnel-service";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller", "market"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;
  const channel = url.searchParams.get("channel") ?? undefined;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 },
    );
  }

  const funnel = getFunnelService();
  const snapshots = await funnel.getFunnelData({
    startDate,
    endDate,
    sellerKey,
    channel,
  });

  // Compute rates for the latest snapshot
  const rates = snapshots.length > 0
    ? funnel.computeFunnelRates(snapshots[snapshots.length - 1])
    : null;

  return NextResponse.json({ snapshots, rates });
}
