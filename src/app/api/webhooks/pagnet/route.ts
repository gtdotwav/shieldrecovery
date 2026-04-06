import {
  handlePagNetHealth,
  handlePagNetWebhook,
} from "@/server/recovery/controllers/webhook-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handlePagNetWebhook(request);
}

export async function GET(request: Request) {
  return handlePagNetHealth(request);
}
