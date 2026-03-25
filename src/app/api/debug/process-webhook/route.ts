import { NextResponse } from "next/server";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { appEnv } from "@/server/recovery/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("id");
  const action = searchParams.get("action") ?? "process";

  if (action === "check") {
    // Diagnostic: check Supabase config and connectivity
    const storage = getStorageService();
    const envInfo = {
      supabaseUrl: appEnv.supabaseUrl ? appEnv.supabaseUrl.slice(0, 40) + "..." : "MISSING",
      supabaseKey: appEnv.supabaseServiceRoleKey ? appEnv.supabaseServiceRoleKey.slice(0, 20) + "..." : "MISSING",
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
          webhookIds: webhooks.map((w) => w.webhookId),
          totalWebhooks: webhooks.length,
        });
      } catch (err) {
        return NextResponse.json({
          ok: false,
          env: envInfo,
          error: err instanceof Error ? err.message : String(err),
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
    const detail =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : {
            raw: String(error),
            type: typeof error,
            keys: typeof error === "object" && error ? Object.keys(error) : [],
            code: (error as Record<string, unknown>)?.code,
            pgMessage: (error as Record<string, unknown>)?.message,
            details: (error as Record<string, unknown>)?.details,
            hint: (error as Record<string, unknown>)?.hint,
          };

    console.error("[debug/process-webhook]", detail);

    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}
