import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerWebhookService } from "@/server/recovery/services/partner-webhook-service";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ partnerId: string; webhookId: string }> };

/**
 * POST /api/admin/partners/{partnerId}/webhooks/{webhookId}/test
 * Send a test event to verify webhook connectivity.
 */
export async function POST(_request: Request, { params }: RouteProps) {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partnerId, webhookId } = await params;
  const service = getPartnerWebhookService();

  // Fetch the specific config
  const configs = await service.getWebhookConfigs(partnerId);
  const config = configs.find((c) => c.id === webhookId);

  if (!config) {
    return NextResponse.json({ error: "Webhook config not found." }, { status: 404 });
  }

  // Dispatch a test event
  const results = await service.dispatchEvent({
    type: "webhook.test",
    partnerId,
    payload: {
      test: true,
      message: "This is a test event from Shield Recovery.",
      timestamp: new Date().toISOString(),
      webhookConfigId: webhookId,
    },
  });

  const result = results.find((r) => r.configId === webhookId);

  if (!result) {
    return NextResponse.json(
      { error: "Webhook did not match any active config for this event type." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    success: result.success,
    status: result.status,
    durationMs: result.durationMs,
    error: result.error,
  });
}
