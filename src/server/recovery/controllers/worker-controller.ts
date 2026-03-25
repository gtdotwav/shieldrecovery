import { NextResponse } from "next/server";

import { appEnv } from "@/server/recovery/config";
import { getRecoveryWorkerService } from "@/server/recovery/services/recovery-worker-service";

export async function handleRunWorker(request: Request) {
  try {
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
    const message = error instanceof Error ? error.message : "Worker run failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
