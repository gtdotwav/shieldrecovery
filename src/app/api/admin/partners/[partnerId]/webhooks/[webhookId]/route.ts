import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerWebhookService } from "@/server/recovery/services/partner-webhook-service";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ partnerId: string; webhookId: string }> };

/**
 * PUT /api/admin/partners/{partnerId}/webhooks/{webhookId}
 * Update a webhook config.
 * Body: { url?, secret?, events?, active? }
 */
export async function PUT(request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { webhookId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.url === "string") {
    const url = body.url.trim();
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid webhook URL." }, { status: 400 });
    }
    updates.url = url;
  }

  if (typeof body.secret === "string") {
    updates.secret = body.secret.trim();
  }

  if (Array.isArray(body.events)) {
    updates.events = (body.events as string[]).filter(
      (e) => typeof e === "string" && e.trim(),
    );
  }

  if (typeof body.active === "boolean") {
    updates.active = body.active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 },
    );
  }

  try {
    const service = getPartnerWebhookService();
    const config = await service.updateWebhookConfig(webhookId, updates);
    return NextResponse.json({ webhook: config });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/partners/{partnerId}/webhooks/{webhookId}
 * Delete a webhook config and all its delivery logs.
 */
export async function DELETE(_request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { webhookId } = await params;

  try {
    const service = getPartnerWebhookService();
    await service.deleteWebhookConfig(webhookId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed." },
      { status: 500 },
    );
  }
}
