import {
  handleBuckPayHealth,
  handleBuckPayWebhook,
} from "@/server/recovery/controllers/webhook-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handleBuckPayWebhook(request);
}

export async function GET(request: Request) {
  return handleBuckPayHealth(request);
}
