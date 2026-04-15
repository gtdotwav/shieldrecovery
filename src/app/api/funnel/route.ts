import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getFunnelService } from "@/server/recovery/services/funnel-service";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "seller" && session.role !== "market") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  let effectiveSellerKey = url.searchParams.get("sellerKey") ?? undefined;
  const channel = url.searchParams.get("channel") ?? undefined;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 },
    );
  }

  if (session.role === "seller") {
    const identity = await getSellerIdentityByEmail(session.email);
    if (!identity) {
      return NextResponse.json({ error: "Seller not found" }, { status: 403 });
    }
    effectiveSellerKey = identity.agentName;
  }

  const funnel = getFunnelService();
  const snapshots = await funnel.getFunnelData({
    startDate,
    endDate,
    sellerKey: effectiveSellerKey,
    channel,
  });

  // Compute rates for the latest snapshot
  const rates = snapshots.length > 0
    ? funnel.computeFunnelRates(snapshots[snapshots.length - 1])
    : null;

  return NextResponse.json({ snapshots, rates });
}
