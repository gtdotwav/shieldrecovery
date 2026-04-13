import { NextResponse } from "next/server";

import { appEnv } from "@/server/recovery/config";
import { logger } from "@/server/recovery/utils/logger";
import { getRecoveryWorkerService } from "@/server/recovery/services/recovery-worker-service";
import { getStorageService } from "@/server/recovery/services/storage";

const STALE_JOB_THRESHOLD_MINUTES = 10;

/**
 * Reset jobs stuck in "processing" state for longer than the threshold.
 * Increments attempts and moves them back to "pending"/"scheduled".
 */
async function resetStaleJobs(): Promise<number> {
  const storage = getStorageService();
  if (storage.mode !== "supabase") return 0;

  try {
    // Access the supabase client through the storage service
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    );

    const cutoff = new Date(
      Date.now() - STALE_JOB_THRESHOLD_MINUTES * 60_000,
    ).toISOString();

    const { data: staleJobs, error: fetchError } = await supabase
      .from("queue_jobs")
      .select("id, attempts")
      .eq("status", "processing")
      .lt("updated_at", cutoff);

    if (fetchError || !staleJobs?.length) return 0;

    let resetCount = 0;
    for (const job of staleJobs) {
      const newAttempts = Math.max(0, (job.attempts ?? 1) - 1);
      const { error: updateError } = await supabase
        .from("queue_jobs")
        .update({
          status: newAttempts > 0 ? "scheduled" : "failed",
          attempts: newAttempts,
          error: "Reset: job stuck in processing state",
        })
        .eq("id", job.id)
        .eq("status", "processing");

      if (!updateError) resetCount++;
    }

    if (resetCount > 0) {
      logger.warn("Reset stale jobs stuck in processing", {
        handler: "handleRunWorker",
        resetCount,
      });
    }

    return resetCount;
  } catch (error) {
    logger.error("Failed to reset stale jobs", {
      handler: "handleRunWorker",
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export async function handleRunWorker(request: Request) {
  try {
    // Reset stale jobs before processing new ones
    await resetStaleJobs();

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") ?? String(appEnv.workerBatchSize));
    const concurrencyParam = Number(
      searchParams.get("concurrency") ?? String(appEnv.workerConcurrency),
    );
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(Math.floor(limitParam), 250)
        : appEnv.workerBatchSize;
    const concurrency =
      Number.isFinite(concurrencyParam) && concurrencyParam > 0
        ? Math.min(Math.floor(concurrencyParam), 16)
        : appEnv.workerConcurrency;
    const summary = await getRecoveryWorkerService().runDueJobs({
      limit,
      concurrency,
    });

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    logger.error("Worker run failed", {
      handler: "handleRunWorker",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: { code: "WORKER_RUN_FAILED", message: "Worker run failed." } },
      { status: 500 },
    );
  }
}
