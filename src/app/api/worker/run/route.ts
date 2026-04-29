import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { authorizeCronRequest } from "@/server/observability/cron-auth";
import { resolveRequestId } from "@/server/observability/request-id";
import { handleRunWorker } from "@/server/recovery/controllers/worker-controller";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = await ensureWorkerAccess(request);
  if (unauthorized) return unauthorized;
  return handleRunWorker(request);
}

export async function POST(request: Request) {
  const unauthorized = await ensureWorkerAccess(request);
  if (unauthorized) return unauthorized;
  return handleRunWorker(request);
}

async function ensureWorkerAccess(request: Request) {
  resolveRequestId(request);
  const cronAuth = authorizeCronRequest(request, { route: "/api/worker/run" });
  if (cronAuth.ok) return null;

  // Fall back to platform session auth for ops/debug usage.
  return ensureAuthenticatedRequest(request);
}
