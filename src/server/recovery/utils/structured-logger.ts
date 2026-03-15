import { randomUUID } from "node:crypto";

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

  return logEntry;
}
