import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (!session || session.role !== "partner" || !session.partnerId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Partner session required." } },
      { status: 401 },
    );
  }

  const snapshot = await getPartnerStorageService().getDashboardSnapshot(
    session.partnerId,
  );

  if (!snapshot) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Partner profile not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json(snapshot);
}
