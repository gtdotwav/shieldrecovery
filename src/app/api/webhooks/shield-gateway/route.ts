import {
  handleShieldGatewayHealth,
  handleShieldGatewayWebhook,
} from "@/server/recovery/controllers/webhook-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handleShieldGatewayWebhook(request);
}

export async function GET(request: Request) {
  return handleShieldGatewayHealth(request);
}
