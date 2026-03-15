import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleHealthCheck } from "@/server/recovery/controllers/health-controller";
import { markAsLegacyRoute } from "@/server/recovery/controllers/route-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return markAsLegacyRoute(await handleHealthCheck(request), "/api/health");
}
