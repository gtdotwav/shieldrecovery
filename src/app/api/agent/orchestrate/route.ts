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
    // If no secret configured, allow (dev mode)
    return true;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const workerHeader = request.headers.get("x-worker-secret") ?? "";

  if (authHeader === `Bearer ${cronSecret}`) return true;
  if (workerHeader === cronSecret) return true;

  return false;
}
