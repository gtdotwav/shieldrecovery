import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { appEnv } from "@/server/recovery/config";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;

  if (authHeader.length !== expected.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("id");
  const action = searchParams.get("action") ?? "process";

  if (action === "check") {
    const storage = getStorageService();
    const envInfo = {
      supabaseUrl: appEnv.supabaseUrl ? "configured" : "MISSING",
      supabaseKey: appEnv.supabaseServiceRoleKey ? "configured" : "MISSING",
      databaseConfigured: appEnv.databaseConfigured,
      storageMode: storage.mode,
    };

    if (webhookId) {
      try {
        const webhooks = await storage.listWebhookEvents(5);
        const found = webhooks.find((w) => w.webhookId === webhookId);
        return NextResponse.json({
          ok: true,
          env: envInfo,
          webhookFound: !!found,
          totalWebhooks: webhooks.length,
        });
      } catch {
        return NextResponse.json({
          ok: false,
          env: envInfo,
          error: "Failed to query webhooks.",
        });
      }
    }

    return NextResponse.json({ ok: true, env: envInfo });
  }

  if (!webhookId) {
    return NextResponse.json({ error: "Missing ?id= parameter" }, { status: 400 });
  }

  try {
    const result = await getPaymentRecoveryService().processQueuedWebhookEvent({
      webhookId,
      timestamp: Math.floor(Date.now() / 1000),
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook failure.";

    console.error("[debug/process-webhook]", error);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
