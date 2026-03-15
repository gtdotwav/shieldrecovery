import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleHealthCheck } from "@/server/recovery/controllers/health-controller";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return handleHealthCheck(request);
}
