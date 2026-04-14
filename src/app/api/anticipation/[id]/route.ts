import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getAnticipationService } from "@/server/recovery/services/anticipation-service";

/**
 * PATCH /api/anticipation/[id]
 * Body: { action: "approve" | "disburse" }
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
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = getAnticipationService();

  if (body.action === "approve") {
    const updated = await service.approveAnticipation(id);
    return NextResponse.json({ ok: true, data: updated });
  }

  if (body.action === "disburse") {
    const updated = await service.disburseAnticipation(id);
    return NextResponse.json({ ok: true, data: updated });
  }

  return NextResponse.json(
    { error: "Invalid action. Expected 'approve' or 'disburse'." },
    { status: 400 },
  );
}
