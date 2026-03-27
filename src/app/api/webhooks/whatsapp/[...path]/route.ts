import {
  handleWhatsAppWebhook,
  handleWhatsAppWebhookVerification,
} from "@/server/recovery/controllers/whatsapp-webhook-controller";

export const maxDuration = 60;

export async function GET(request: Request) {
  return handleWhatsAppWebhookVerification(request);
}

export async function POST(request: Request) {
  return handleWhatsAppWebhook(request);
}
