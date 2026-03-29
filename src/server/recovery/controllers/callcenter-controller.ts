import { NextResponse } from "next/server";

import { getStorageService } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { HttpError } from "@/server/recovery/utils/http-error";
import { requireAuthenticatedSession } from "@/server/auth/session";
import type {
  CallAnalytics,
  CallRecord,
  CreateCallInput,
  UpdateCallInput,
} from "@/server/recovery/types";

/* ── Webhook — receives events from the callcenter frontend ── */

export async function handleCallcenterWebhook(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const storage = getStorageService();
  const eventType = typeof body.event === "string" ? body.event : "unknown";

  try {
    switch (eventType) {
      case "call.started": {
        const call = await storage.createCall({
          leadId: asOptionalString(body.lead_id),
          customerId: asOptionalString(body.customer_id),
          agentId: asOptionalString(body.agent_id),
          campaignId: asOptionalString(body.campaign_id),
          direction: body.direction === "inbound" ? "inbound" : "outbound",
          fromNumber: asOptionalString(body.from_number),
          toNumber: requireString(body.to_number, "to_number"),
          provider: asCallProvider(body.provider),
          providerCallId: asOptionalString(body.provider_call_id),
          metadata: typeof body.metadata === "object" && body.metadata ? (body.metadata as Record<string, unknown>) : {},
        } satisfies CreateCallInput);

        await storage.updateCall(call.id, { status: "ringing", startedAt: new Date().toISOString() });
        await storage.createCallEvent(call.id, "initiated", body);

        return NextResponse.json({ ok: true, callId: call.id }, { status: 201 });
      }

      case "call.answered": {
        const call = await resolveCall(storage, body);
        await storage.updateCall(call.id, {
          status: "in_progress",
          answeredAt: asOptionalString(body.answered_at) ?? new Date().toISOString(),
        });
        await storage.createCallEvent(call.id, "answered", body);

        return NextResponse.json({ ok: true, callId: call.id });
      }

      case "call.ended":
      case "call.completed": {
        const call = await resolveCall(storage, body);
        const update: UpdateCallInput = {
          status: "completed",
          endedAt: asOptionalString(body.ended_at) ?? new Date().toISOString(),
          durationSeconds: asOptionalNumber(body.duration_seconds),
          ringDurationSeconds: asOptionalNumber(body.ring_duration_seconds),
          recordingUrl: asOptionalString(body.recording_url),
          recordingDurationSeconds: asOptionalNumber(body.recording_duration_seconds),
          transcript: asOptionalString(body.transcript),
          transcriptSummary: asOptionalString(body.transcript_summary) ?? asOptionalString(body.summary),
          outcome: asCallOutcome(body.outcome),
          outcomeNotes: asOptionalString(body.outcome_notes),
          callbackScheduledAt: asOptionalString(body.callback_scheduled_at),
          providerCallId: asOptionalString(body.provider_call_id),
          providerCost: asOptionalNumber(body.cost) ?? asOptionalNumber(body.provider_cost),
          sentiment: asCallSentiment(body.sentiment),
        };

        if (body.status === "no_answer") update.status = "no_answer";
        else if (body.status === "busy") update.status = "busy";
        else if (body.status === "voicemail") update.status = "voicemail";
        else if (body.status === "failed") update.status = "failed";
        else if (body.status === "cancelled") update.status = "cancelled";

        await storage.updateCall(call.id, update);
        await storage.createCallEvent(call.id, "ended", body);

        // Update lead status if outcome is "recovered"
        if (update.outcome === "recovered" && call.leadId) {
          try {
            await storage.updateLeadStatus({ leadId: call.leadId, status: "RECOVERED" });
          } catch {
            // Lead may not exist or already recovered
          }
        }

        return NextResponse.json({ ok: true, callId: call.id });
      }

      case "call.failed": {
        const call = await resolveCall(storage, body);
        await storage.updateCall(call.id, {
          status: "failed",
          endedAt: new Date().toISOString(),
          outcomeNotes: asOptionalString(body.error) ?? asOptionalString(body.reason),
        });
        await storage.createCallEvent(call.id, "error", body);

        return NextResponse.json({ ok: true, callId: call.id });
      }

      case "call.recording_ready": {
        const call = await resolveCall(storage, body);
        await storage.updateCall(call.id, {
          recordingUrl: asOptionalString(body.recording_url),
          recordingDurationSeconds: asOptionalNumber(body.recording_duration_seconds),
        });

        return NextResponse.json({ ok: true, callId: call.id });
      }

      case "call.transcript_ready": {
        const call = await resolveCall(storage, body);
        await storage.updateCall(call.id, {
          transcript: asOptionalString(body.transcript),
          transcriptSummary: asOptionalString(body.summary) ?? asOptionalString(body.transcript_summary),
          sentiment: asCallSentiment(body.sentiment),
        });

        return NextResponse.json({ ok: true, callId: call.id });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown event type: ${eventType}` },
          { status: 422 },
        );
    }
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Callcenter webhook failed.";

    await storage
      .addLog(
        createStructuredLog({
          eventType: "processing_error",
          level: statusCode >= 500 ? "error" : "warn",
          message: `[callcenter] ${message}`,
          context: { eventType, statusCode },
        }),
      )
      .catch(() => {});

    return NextResponse.json(
      { ok: false, error: message },
      { status: statusCode },
    );
  }
}

/* ── REST API — calls CRUD ── */

export async function handleListCalls(request: Request) {
  await requireAuthenticatedSession(["admin", "seller"]);
  const url = new URL(request.url);
  const storage = getStorageService();

  const calls = await storage.listCalls({
    leadId: url.searchParams.get("leadId") ?? undefined,
    customerId: url.searchParams.get("customerId") ?? undefined,
    campaignId: url.searchParams.get("campaignId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    limit: Number(url.searchParams.get("limit")) || 50,
  });

  return NextResponse.json({ ok: true, calls });
}

export async function handleGetCall(request: Request, callId: string) {
  await requireAuthenticatedSession(["admin", "seller"]);
  const storage = getStorageService();

  const call = await storage.getCall(callId);
  if (!call) {
    return NextResponse.json({ ok: false, error: "Call not found." }, { status: 404 });
  }

  const events = await storage.getCallEvents(callId);
  return NextResponse.json({ ok: true, call, events });
}

export async function handleCreateCall(request: Request) {
  await requireAuthenticatedSession(["admin", "seller"]);
  const body = await request.json();
  const storage = getStorageService();

  const call = await storage.createCall({
    leadId: asOptionalString(body.leadId),
    customerId: asOptionalString(body.customerId),
    agentId: asOptionalString(body.agentId),
    campaignId: asOptionalString(body.campaignId),
    direction: body.direction === "inbound" ? "inbound" : "outbound",
    fromNumber: asOptionalString(body.fromNumber),
    toNumber: requireString(body.toNumber, "toNumber"),
    provider: asCallProvider(body.provider),
    providerCallId: asOptionalString(body.providerCallId),
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
  });

  return NextResponse.json({ ok: true, call }, { status: 201 });
}

export async function handleCallAnalytics(_request: Request) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();
  const analytics = await storage.getCallAnalytics();

  return NextResponse.json({ ok: true, ...analytics });
}

/* ── Campaigns ── */

export async function handleListCampaigns(_request: Request) {
  await requireAuthenticatedSession(["admin", "seller"]);
  const storage = getStorageService();
  const campaigns = await storage.listCallCampaigns();

  return NextResponse.json({ ok: true, campaigns });
}

export async function handleCreateCampaign(request: Request) {
  await requireAuthenticatedSession(["admin"]);
  const body = await request.json();
  const storage = getStorageService();

  const campaign = await storage.createCallCampaign({
    name: requireString(body.name, "name"),
    description: asOptionalString(body.description),
    filterCriteria: typeof body.filterCriteria === "object" ? body.filterCriteria : {},
    createdBy: asOptionalString(body.createdBy),
  });

  return NextResponse.json({ ok: true, campaign }, { status: 201 });
}

/* ── Helpers ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCall(storage: any, body: Record<string, unknown>): Promise<CallRecord> {
  const callId = asOptionalString(body.call_id) ?? asOptionalString(body.callId);
  const providerCallId = asOptionalString(body.provider_call_id) ?? asOptionalString(body.providerCallId);

  if (callId) {
    const call = await storage.getCall(callId);
    if (call) return call;
  }

  if (providerCallId) {
    const call = await storage.getCallByProviderCallId(providerCallId);
    if (call) return call;
  }

  throw new HttpError(404, "Call not found. Provide call_id or provider_call_id.");
}

function requireString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new HttpError(400, `Missing required field: ${field}`);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asCallProvider(value: unknown) {
  const valid = ["vapi", "bland", "retell", "twilio", "manual"];
  return typeof value === "string" && valid.includes(value) ? (value as CreateCallInput["provider"]) : "vapi";
}

function asCallOutcome(value: unknown) {
  const valid = [
    "recovered", "callback_scheduled", "interested", "no_interest",
    "wrong_number", "voicemail_left", "no_voicemail", "technical_issue", "other",
  ];
  return typeof value === "string" && valid.includes(value) ? (value as CallRecord["outcome"]) : undefined;
}

function asCallSentiment(value: unknown) {
  const valid = ["positive", "neutral", "negative"];
  return typeof value === "string" && valid.includes(value) ? (value as CallRecord["sentiment"]) : undefined;
}
