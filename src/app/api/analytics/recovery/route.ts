import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleRecoveryAnalytics } from "@/server/recovery/controllers/analytics-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return handleRecoveryAnalytics();
}
