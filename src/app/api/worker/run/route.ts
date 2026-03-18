import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleRunWorker } from "@/server/recovery/controllers/worker-controller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await ensureWorkerAccess(request);

  if (unauthorized) {
    return unauthorized;
  }

  return handleRunWorker(request);
}

export async function POST(request: Request) {
  const unauthorized = await ensureWorkerAccess(request);

  if (unauthorized) {
    return unauthorized;
  }

  return handleRunWorker(request);
}

async function ensureWorkerAccess(request: Request) {
  if (hasValidWorkerSecret(request)) {
    return null;
  }

  return ensureAuthenticatedRequest(request);
}

function hasValidWorkerSecret(request: Request) {
  const secrets = [
    process.env.WORKER_AUTH_TOKEN?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter(Boolean) as string[];

  if (!secrets.length) {
    return false;
  }

  const bearerHeader = request.headers.get("authorization");
  const bearerToken = bearerHeader?.startsWith("Bearer ")
    ? bearerHeader.slice("Bearer ".length).trim()
    : "";
  const headerToken = request.headers.get("x-worker-secret")?.trim() ?? "";

  return secrets.some((secret) => secret === bearerToken || secret === headerToken);
}
