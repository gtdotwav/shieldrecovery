import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getNegativationService } from "@/server/recovery/services/negativation-service";

/**
 * GET /api/negativation/[id]
 * Lists all negativations and returns the one matching `id`.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const service = getNegativationService();
  const all = await service.listNegativations();
  const negativation = all.find((n) => n.id === id);

  if (!negativation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: negativation });
}

/**
 * PATCH /api/negativation/[id]
 * Body: { action: "send_notice" | "register" | "remove" }
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

  const service = getNegativationService();

  switch (body.action) {
    case "send_notice": {
      const result = await service.sendExtrajudicialNotice(id);
      return NextResponse.json({ ok: true, data: result });
    }
    case "register": {
      const result = await service.registerWithBureau(id);
      return NextResponse.json({ ok: true, data: result });
    }
    case "remove": {
      const result = await service.removeFromBureau(id);
      return NextResponse.json({ ok: true, data: result });
    }
    default:
      return NextResponse.json(
        { error: "Invalid action. Expected 'send_notice', 'register', or 'remove'." },
        { status: 400 },
      );
  }
}
