import {
  handlePagouAiHealth,
  handlePagouAiWebhook,
} from "@/server/recovery/controllers/webhook-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handlePagouAiWebhook(request);
}

export async function GET(request: Request) {
  return handlePagouAiHealth(request);
}

