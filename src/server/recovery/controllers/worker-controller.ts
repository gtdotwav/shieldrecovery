import { NextResponse } from "next/server";

import { appEnv } from "@/server/recovery/config";
import { logger } from "@/server/recovery/utils/logger";
import { getRecoveryWorkerService } from "@/server/recovery/services/recovery-worker-service";
import { getStorageService } from "@/server/recovery/services/storage";

const STALE_JOB_THRESHOLD_MINUTES = 5;
const DEAD_JOB_MAX_AGE_DAYS = 7;

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
      // Stale job didn't actually run — reschedule with same attempts, don't decrement
      const newAttempts = job.attempts ?? 3;
      const { error: updateError } = await supabase
        .from("queue_jobs")
        .update({
          status: "scheduled",
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

/**
 * Dead Letter Queue cleanup: archive permanently failed jobs into
 * dead_letter_jobs (forensic record) and remove originals.
 * Falls back to plain DELETE if the archive RPC is not yet deployed.
 */
async function cleanupDeadJobs(): Promise<number> {
  const storage = getStorageService();
  if (storage.mode !== "supabase") return 0;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    );

    const cutoff = new Date(
      Date.now() - DEAD_JOB_MAX_AGE_DAYS * 24 * 60 * 60_000,
    ).toISOString();

    // Preferred path: atomic archive via RPC (see migration
    // 20260429_atomic_job_claim_and_dlq.sql).
    const archiveResult = await supabase.rpc("archive_dead_jobs", {
      p_cutoff: cutoff,
    });

    if (!archiveResult.error) {
      const archived = Number(archiveResult.data ?? 0);
      if (archived > 0) {
        logger.error("Dead letter queue archived terminal jobs", {
          handler: "cleanupDeadJobs",
          archivedCount: archived,
          maxAgeDays: DEAD_JOB_MAX_AGE_DAYS,
          // logger.error pushes this to Sentry as an alert so on-call sees the trend.
        });
      }
      return archived;
    }

    logger.warn("archive_dead_jobs RPC failed; falling back to delete-only", {
      error: archiveResult.error.message,
    });

    // Legacy fallback: plain DELETE.
    const { count, error } = await supabase
      .from("queue_jobs")
      .delete({ count: "exact" })
      .eq("status", "failed")
      .eq("attempts", 0)
      .lt("created_at", cutoff);

    if (error) {
      logger.error("Failed to cleanup dead jobs (legacy path)", {
        handler: "cleanupDeadJobs",
        error: error.message,
      });
      return 0;
    }

    const deleted = count ?? 0;
    if (deleted > 0) {
      logger.error("Dead letter queue purged terminal jobs (no archive)", {
        handler: "cleanupDeadJobs",
        deletedCount: deleted,
        maxAgeDays: DEAD_JOB_MAX_AGE_DAYS,
      });
    }
    return deleted;
  } catch (error) {
    logger.error("Dead job cleanup failed", {
      handler: "cleanupDeadJobs",
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export async function handleRunWorker(request: Request) {
  try {
    // Reset stale jobs and clean up dead jobs before processing new ones
    await Promise.all([resetStaleJobs(), cleanupDeadJobs()]);

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
