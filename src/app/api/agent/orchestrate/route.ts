import { authorizeCronRequest } from "@/server/observability/cron-auth";
import { resolveRequestId } from "@/server/observability/request-id";
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
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  resolveRequestId(request);
  const result = authorizeCronRequest(request, { route: "/api/agent/orchestrate" });
  if (!result.ok) {
    return Response.json(
      { ok: false, error: "Unauthorized", reason: result.reason },
      { status: 401 },
    );
  }
  return handleAgentOrchestrate(request);
}
