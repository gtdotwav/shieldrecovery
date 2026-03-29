import { getAutonomousAgent } from "@/server/recovery/ai/autonomous-agent";

/**
 * Handle the autonomous agent cron tick.
 * Called by /api/agent/orchestrate every 5 minutes.
 */
export async function handleAgentOrchestrate(
  request: Request,
): Promise<Response> {
  try {
    const agent = getAutonomousAgent();
    const result = await agent.tick();

    return Response.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown agent error";

    return Response.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
