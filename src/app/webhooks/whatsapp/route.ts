import {
  handleWhatsAppWebhook,
  handleWhatsAppWebhookVerification,
} from "@/server/recovery/controllers/whatsapp-webhook-controller";
import { markAsLegacyRoute } from "@/server/recovery/controllers/route-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return markAsLegacyRoute(
    await handleWhatsAppWebhookVerification(request),
    "/api/webhooks/whatsapp",
  );
}

export async function POST(request: Request) {
  return markAsLegacyRoute(
    await handleWhatsAppWebhook(request),
    "/api/webhooks/whatsapp",
  );
}
