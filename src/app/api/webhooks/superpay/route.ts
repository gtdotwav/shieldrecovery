import {
  handleSuperPayHealth,
  handleSuperPayWebhook,
} from "@/server/recovery/controllers/webhook-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handleSuperPayWebhook(request);
}

export async function GET(request: Request) {
  return handleSuperPayHealth(request);
}
