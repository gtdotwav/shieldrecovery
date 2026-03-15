import {
  handleWhatsAppWebhook,
  handleWhatsAppWebhookVerification,
} from "@/server/recovery/controllers/whatsapp-webhook-controller";

export async function GET(request: Request) {
  return handleWhatsAppWebhookVerification(request);
}

export async function POST(request: Request) {
  return handleWhatsAppWebhook(request);
}
