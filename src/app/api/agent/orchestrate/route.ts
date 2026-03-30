import { timingSafeEqual } from "node:crypto";
import { handleAgentOrchestrate } from "@/server/recovery/controllers/agent-controller";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

/**
 * Autonomous Recovery Agent — Cron endpoint.
 *
 * Runs every 5 minutes via Vercel Cron.
 * Authenticates with CRON_SECRET (same as worker).
 *
 * GET /api/agent/orchestrate — triggered by Vercel Cron
 * POST /api/agent/orchestrate — manual trigger
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return handleAgentOrchestrate(request);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return handleAgentOrchestrate(request);
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // Secret not configured — deny all access
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const workerHeader = request.headers.get("x-worker-secret") ?? "";

  // Check Bearer token (timing-safe)
  const expectedBearer = `Bearer ${cronSecret}`;
  if (authHeader.length === expectedBearer.length) {
    try {
      if (timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedBearer))) {
        return true;
      }
    } catch {
      // length mismatch after encoding — fall through
    }
  }

  // Check x-worker-secret header (timing-safe)
  if (workerHeader.length === cronSecret.length) {
    try {
      if (timingSafeEqual(Buffer.from(workerHeader), Buffer.from(cronSecret))) {
        return true;
      }
    } catch {
      // fall through
    }
  }

  return false;
}
