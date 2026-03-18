import {
  handleShieldGatewayHealth,
  handleShieldGatewayWebhook,
} from "@/server/recovery/controllers/webhook-controller";
import { markAsLegacyRoute } from "@/server/recovery/controllers/route-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    sellerKey: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { sellerKey } = await params;
  return markAsLegacyRoute(
    await handleShieldGatewayWebhook(request, { sellerKey }),
    `/api/webhooks/shield-gateway/${sellerKey}`,
  );
}

export async function GET(request: Request, { params }: RouteProps) {
  const { sellerKey } = await params;
  return markAsLegacyRoute(
    await handleShieldGatewayHealth(request, { sellerKey }),
    `/api/webhooks/shield-gateway/${sellerKey}`,
  );
}
