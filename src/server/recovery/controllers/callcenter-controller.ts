import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";

import { getStorageService } from "@/server/recovery/services/storage";
import type { RecoveryStorage } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { HttpError } from "@/server/recovery/utils/http-error";
import { requireAuthenticatedSession } from "@/server/auth/session";
import type {
  CallAnalytics,
  CallRecord,
  CreateCallInput,
  UpdateCallInput,
} from "@/server/recovery/types";
import { createCheckoutSession } from "@/server/checkout";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

const createCallSchema = z.object({
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  agentId: z.string().optional(),
  campaignId: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  fromNumber: z.string().optional(),
  toNumber: z.string().min(1, "toNumber is required."),
  provider: z.enum(["vapi", "bland", "retell", "twilio", "manual"]).optional(),
  providerCallId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, "name is required."),
  description: z.string().optional(),
  filterCriteria: z.record(z.string(), z.unknown()).optional(),
  createdBy: z.string().optional(),
});

/* ── Webhook — receives events from the callcenter frontend ── */

function verifyCallcenterAuth(request: Request): boolean {
  const secret = process.env.CALLCENTER_WEBHOOK_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return false; // deny access when no secret is configured

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const bufA = Buffer.from(token.padEnd(64, "\0"));
  const bufB = Buffer.from(secret.padEnd(64, "\0"));
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function handleCallcenterWebhook(request: Request) {
  if (!verifyCallcenterAuth(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

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
        const chosenMethod = asChosenPaymentMethod(body.payment_method ?? body.chosen_payment_method ?? body.paymentMethod);
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
          chosenPaymentMethod: chosenMethod,
        };

        if (body.status === "no_answer") update.status = "no_answer";
        else if (body.status === "busy") update.status = "busy";
        else if (body.status === "voicemail") update.status = "voicemail";
        else if (body.status === "failed") update.status = "failed";
        else if (body.status === "cancelled") update.status = "cancelled";

        await storage.updateCall(call.id, update);
        await storage.createCallEvent(call.id, "ended", body);

        // Update lead status based on call outcome
        if (call.leadId && update.outcome) {
          try {
            if (update.outcome === "recovered") {
              await storage.updateLeadStatus({ leadId: call.leadId, status: "RECOVERED" });
            } else if (
              update.outcome === "interested" ||
              update.outcome === "callback_scheduled"
            ) {
              // Positive outcome — transition to WAITING_CUSTOMER
              await storage.updateLeadStatus({ leadId: call.leadId, status: "WAITING_CUSTOMER" });
            } else if (update.outcome === "no_interest") {
              // Negative outcome — mark as LOST
              await storage.updateLeadStatus({ leadId: call.leadId, status: "LOST" });
            }
          } catch {
            // Lead may not exist or already in target status
          }
        }

        // Dispatch checkout link when the call ends with a positive outcome
        const positiveOutcomes = ["recovered", "interested", "callback_scheduled"];
        if (positiveOutcomes.includes(update.outcome ?? "") && call.leadId) {
          dispatchPostCallCheckout(storage, call, update).catch((err) => {
            console.error("[callcenter] Post-call checkout dispatch failed", {
              callId: call.id,
              error: err instanceof Error ? err.message : err,
            });
          });
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createCallSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const storage = getStorageService();

  const call = await storage.createCall({
    leadId: body.leadId,
    customerId: body.customerId,
    agentId: body.agentId,
    campaignId: body.campaignId,
    direction: body.direction === "inbound" ? "inbound" : "outbound",
    fromNumber: body.fromNumber,
    toNumber: body.toNumber,
    provider: asCallProvider(body.provider),
    providerCallId: body.providerCallId,
    metadata: body.metadata ?? {},
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createCampaignSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const storage = getStorageService();

  const campaign = await storage.createCallCampaign({
    name: body.name,
    description: body.description,
    filterCriteria: body.filterCriteria ?? {},
    createdBy: body.createdBy,
  });

  return NextResponse.json({ ok: true, campaign }, { status: 201 });
}

/* ── Helpers ── */

async function resolveCall(storage: RecoveryStorage, body: Record<string, unknown>): Promise<CallRecord> {
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

function asChosenPaymentMethod(value: unknown): "pix" | "card" | "boleto" | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.toLowerCase().trim();
  if (normalized === "pix") return "pix";
  if (normalized === "card" || normalized === "cartao" || normalized === "credit_card" || normalized === "credit" || normalized === "debit") return "card";
  if (normalized === "boleto" || normalized === "bank_slip") return "boleto";
  return undefined;
}

/* ── Post-call checkout dispatch ── */

/**
 * After a call ends with a positive outcome, generates a checkout session
 * with the seller's coupon/discount and the customer's chosen payment method,
 * then dispatches the payment link via WhatsApp/SMS.
 */
async function dispatchPostCallCheckout(
  storage: RecoveryStorage,
  call: CallRecord,
  update: UpdateCallInput,
) {
  if (!call.leadId) return;

  const service = getPaymentRecoveryService();
  const contacts = await service.getFollowUpContacts();
  const contact = contacts.find((c) => c.lead_id === call.leadId);

  if (!contact) {
    await storage.addLog(
      createStructuredLog({
        eventType: "callcenter_checkout",
        level: "warn",
        message: `[callcenter] No contact found for lead ${call.leadId} — skipping checkout dispatch.`,
        context: { callId: call.id, leadId: call.leadId },
      }),
    ).catch(() => {});
    return;
  }

  // Resolve seller settings for coupon & discount
  const sellerKey = call.sellerKey ?? contact.assigned_agent ?? "";
  const settings = sellerKey ? await storage.getCallcenterSettings(sellerKey) : undefined;

  const discountPercent = call.discountPercent ?? settings?.discountPercent ?? 0;
  const couponCode = settings?.couponCode || undefined;
  const chosenMethod = update.chosenPaymentMethod ?? call.chosenPaymentMethod;

  // Resolve seller checkout overrides (custom checkout URL per seller)
  let checkoutOverrides: { baseUrl?: string; apiKey?: string } | undefined;
  if (sellerKey) {
    const allControls = await storage.getSellerAdminControls();
    const sellerControl = allControls.find((c) => c.sellerKey === sellerKey);
    if (sellerControl?.checkoutUrl) {
      checkoutOverrides = {
        baseUrl: sellerControl.checkoutUrl,
        apiKey: sellerControl.checkoutApiKey,
      };
    }
  }

  // Create checkout session with coupon and chosen payment method
  let checkoutUrl: string | undefined;
  let sessionId: string | undefined;

  try {
    const result = await createCheckoutSession(
      {
        amount: contact.payment_value / 100,
        description: contact.product
          ? `${contact.product} — recuperacao via chamada`
          : `Pagamento #${contact.gateway_payment_id}`,
        customerName: contact.customer_name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        source: "callcenter",
        sourceReferenceId: call.id,
        couponCode,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        metadata: {
          callId: call.id,
          leadId: call.leadId,
          outcome: update.outcome,
          chosenPaymentMethod: chosenMethod,
          gatewayPaymentId: contact.gateway_payment_id,
          orderId: contact.order_id,
        },
      },
      checkoutOverrides,
    );

    checkoutUrl = result.checkoutUrl;
    sessionId = result.sessionId;

    // Append ?method= to pre-select the chosen payment method
    if (chosenMethod && checkoutUrl) {
      const sep = checkoutUrl.includes("?") ? "&" : "?";
      checkoutUrl = `${checkoutUrl}${sep}method=${chosenMethod}`;
    }

    // Store checkout info on the call record
    await storage.updateCall(call.id, {
      checkoutSessionId: sessionId,
      checkoutUrl,
    });
  } catch (err) {
    await storage.addLog(
      createStructuredLog({
        eventType: "callcenter_checkout",
        level: "error",
        message: `[callcenter] Failed to create checkout session for call ${call.id}.`,
        context: {
          callId: call.id,
          leadId: call.leadId,
          error: err instanceof Error ? err.message : String(err),
        },
      }),
    ).catch(() => {});
    return;
  }

  // Dispatch the payment link to the customer via WhatsApp
  if (!checkoutUrl) return;

  const phone = contact.phone?.replace(/\D/g, "");
  if (!phone) return;

  // Upsert conversation for the customer (finds existing or creates new)
  const conversation = await storage.upsertConversation({
    channel: "whatsapp",
    contactValue: contact.phone,
    customerName: contact.customer_name,
  });

  const messaging = new MessagingService();
  const methodLabel =
    chosenMethod === "pix" ? "PIX" : chosenMethod === "card" ? "cartao" : chosenMethod === "boleto" ? "boleto" : "pagamento";
  const discountLabel = discountPercent > 0 ? ` com ${discountPercent}% de desconto` : "";
  const couponLabel = couponCode ? ` (cupom: ${couponCode})` : "";

  const content = [
    `Oi, ${contact.customer_name}! Conforme conversamos por telefone, segue seu link de pagamento via ${methodLabel}${discountLabel}${couponLabel}:`,
    "",
    checkoutUrl,
    "",
    "Se precisar de algo, estamos por aqui!",
  ].join("\n");

  const messageMetadata = {
    kind: "recovery_prompt" as const,
    generatedBy: "workflow" as const,
    nextAction: "send_checkout_link" as const,
    paymentMethod: chosenMethod,
    paymentUrl: checkoutUrl,
    retryLink: checkoutUrl,
    paymentValue: contact.payment_value,
    product: contact.product,
    gatewayPaymentId: contact.gateway_payment_id,
    orderId: contact.order_id,
  };

  const dispatch = await messaging.dispatchOutboundMessage({
    conversation,
    content,
    metadata: messageMetadata,
  });

  // Persist the outbound message in the conversation
  await storage.createMessage({
    conversationId: conversation.id,
    channel: conversation.channel,
    direction: "outbound",
    senderAddress: "callcenter",
    senderName: "CallCenter",
    content,
    status: dispatch.status === "failed" ? "failed" : "sent",
    lead: undefined,
    customerId: call.customerId,
    metadata: messageMetadata,
  });

  await storage.addLog(
    createStructuredLog({
      eventType: "callcenter_checkout",
      level: dispatch.status === "failed" ? "warn" : "info",
      message: dispatch.status === "failed"
        ? `[callcenter] Checkout link created but WhatsApp dispatch failed for ${contact.customer_name}. Link: ${checkoutUrl}`
        : `[callcenter] Checkout link dispatched to ${contact.customer_name} after call (${update.outcome}).`,
      context: {
        callId: call.id,
        leadId: call.leadId,
        checkoutUrl,
        chosenMethod,
        couponCode,
        discountPercent,
        conversationId: conversation.id,
        dispatchStatus: dispatch.status,
        dispatchError: dispatch.error,
      },
    }),
  ).catch(() => {});
}
