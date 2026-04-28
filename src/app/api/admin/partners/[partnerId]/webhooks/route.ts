import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerWebhookService } from "@/server/recovery/services/partner-webhook-service";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ partnerId: string }> };

/**
 * GET /api/admin/partners/{partnerId}/webhooks
 * List all webhook configs for a partner.
 */
export async function GET(_request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partnerId } = await params;
  const service = getPartnerWebhookService();
  const configs = await service.getWebhookConfigs(partnerId);

  return NextResponse.json({ webhooks: configs });
}

/**
 * POST /api/admin/partners/{partnerId}/webhooks
 * Create a new webhook config for a partner.
 * Body: { url, secret, events? }
 */
export async function POST(request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partnerId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const secret = typeof body.secret === "string" ? body.secret.trim() : "";

  if (!url || !secret) {
    return NextResponse.json(
      { error: "url and secret are required." },
      { status: 400 },
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook URL." },
      { status: 400 },
    );
  }

  const events = Array.isArray(body.events)
    ? (body.events as string[]).filter((e) => typeof e === "string" && e.trim())
    : undefined;

  const service = getPartnerWebhookService();
  const config = await service.createWebhookConfig(partnerId, url, secret, events);

  return NextResponse.json({ webhook: config }, { status: 201 });
}
