import { randomUUID } from "node:crypto";

import { captureException, captureMessage } from "@/server/observability/sentry";
import type { SystemLogRecord } from "@/server/recovery/types";

export function createStructuredLog(
  input: Omit<SystemLogRecord, "id" | "createdAt">,
): SystemLogRecord {
  const logEntry: SystemLogRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  console[input.level === "error" ? "error" : input.level === "warn" ? "warn" : "info"](
    JSON.stringify(logEntry),
  );

  if (input.level === "error") {
    const ctxError = (input.context as Record<string, unknown> | undefined)?.error;
    if (ctxError instanceof Error) {
      captureException(ctxError, {
        tags: { event_type: input.eventType ?? "unknown" },
        extra: { ...input.context, message: input.message },
      });
    } else {
      captureMessage(input.message, "error", {
        tags: { event_type: input.eventType ?? "unknown" },
        extra: { ...input.context },
      });
    }
  } else if (input.level === "warn") {
    captureMessage(input.message, "warning", {
      tags: { event_type: input.eventType ?? "unknown" },
      extra: { ...input.context },
    });
  }

  return logEntry;
}
