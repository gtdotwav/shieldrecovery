import {
  handleShieldGatewayHealth,
  handleShieldGatewayWebhook,
} from "@/server/recovery/controllers/webhook-controller";

type RouteProps = {
  params: Promise<{
    sellerKey: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { sellerKey } = await params;
  return handleShieldGatewayWebhook(request, { sellerKey });
}

export async function GET(request: Request, { params }: RouteProps) {
  const { sellerKey } = await params;
  return handleShieldGatewayHealth(request, { sellerKey });
}
