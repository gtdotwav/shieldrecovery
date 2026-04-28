import { NextResponse } from "next/server";

import { handleGetCall } from "@/server/recovery/controllers/callcenter-controller";
import { requireApiAuth } from "@/server/auth/request";
import { isErrorResponse } from "@/server/recovery/utils/api-response";
import { getStorageService } from "@/server/recovery/services/storage";
import { processCallOutcome } from "@/server/recovery/services/call-outcome-processor";
import type { UpdateCallInput } from "@/server/recovery/types";

export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  return handleGetCall(request, callId);
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "no_answer",
  "busy",
  "voicemail",
  "cancelled",
]);

/**
 * PUT /api/calls/{callId}
 * Update a call record's status and metadata.
 * When the status transitions to a terminal state, triggers call outcome processing.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  const { callId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const storage = getStorageService();

  const existing = await storage.getCall(callId);
  if (!existing) {
    return NextResponse.json({ error: "Call not found." }, { status: 404 });
  }

  // Build update input from body
  const update: UpdateCallInput = {};

  if (typeof body.status === "string") update.status = body.status as UpdateCallInput["status"];
  if (typeof body.outcome === "string") update.outcome = body.outcome as UpdateCallInput["outcome"];
  if (typeof body.outcomeNotes === "string") update.outcomeNotes = body.outcomeNotes;
  if (typeof body.sentiment === "string") update.sentiment = body.sentiment as UpdateCallInput["sentiment"];
  if (typeof body.transcript === "string") update.transcript = body.transcript;
  if (typeof body.transcriptSummary === "string") update.transcriptSummary = body.transcriptSummary;
  if (typeof body.recordingUrl === "string") update.recordingUrl = body.recordingUrl;
  if (typeof body.endedAt === "string") update.endedAt = body.endedAt;
  if (typeof body.durationSeconds === "number") update.durationSeconds = body.durationSeconds;
  if (typeof body.callbackScheduledAt === "string") update.callbackScheduledAt = body.callbackScheduledAt;

  const call = await storage.updateCall(callId, update);

  // If the call just transitioned to a terminal state, process the outcome
  const newStatus = update.status ?? existing.status;
  const wasTerminal = TERMINAL_STATUSES.has(existing.status);
  const isNowTerminal = TERMINAL_STATUSES.has(newStatus);

  if (isNowTerminal && !wasTerminal) {
    processCallOutcome(callId).catch((err) => {
      console.error("[calls] Call outcome processing failed:", {
        callId,
        error: err instanceof Error ? err.message : err,
      });
    });
  }

  return NextResponse.json({ ok: true, call });
}
