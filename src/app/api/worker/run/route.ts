import { timingSafeEqual } from "node:crypto";
import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleRunWorker } from "@/server/recovery/controllers/worker-controller";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
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

  return secrets.some(
    (secret) =>
      (bearerToken && safeCompare(secret, bearerToken)) ||
      (headerToken && safeCompare(secret, headerToken)),
  );
}
