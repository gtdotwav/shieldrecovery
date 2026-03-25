import { handlePagouAiWebhook } from "@/server/recovery/controllers/webhook-controller";
import { markAsLegacyRoute } from "@/server/recovery/controllers/route-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return markAsLegacyRoute(
    await handlePagouAiWebhook(request),
    "/api/webhooks/pagouai",
  );
}

