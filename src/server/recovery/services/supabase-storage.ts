import { randomUUID } from "node:crypto";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Sanitize a value for use in PostgREST filter strings (.or(), .filter()).
 * Prevents injection of PostgREST operators by stripping dangerous characters.
 */
function sanitizeFilterValue(value: string | null | undefined): string {
  if (!value) return "";
  // Allow only alphanumeric, hyphens, underscores, dots, and @
  // This blocks commas, parentheses, and PostgREST operators
  return value.replace(/[^a-zA-Z0-9\-_\.@]/g, "");
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate and sanitize a value expected to be a UUID.
 * Returns the sanitized value if it matches UUID format, empty string otherwise.
 */
function sanitizeUuidFilterValue(value: string | null | undefined): string {
  const sanitized = sanitizeFilterValue(value);
  if (!sanitized) return "";
  if (!UUID_REGEX.test(sanitized)) return "";
  return sanitized;
}

import { buildGatewayWebhookPath, platformBrand } from "@/lib/platform";
import { appEnv, createDefaultConnectionSettings } from "@/server/recovery/config";
import type {
  AffiliateLinkInput,
  AffiliateLinkRecord,
  AffiliateReferralRecord,
  AffiliateStats,
  AgentRecord,
  CalendarActivityItem,
  CalendarDaySummary,
  CalendarNoteRecord,
  CalendarSnapshot,
  CallAnalytics,
  CallCampaignRecord,
  CallcenterSettingsInput,
  CallcenterSettingsRecord,
  CallEventRecord,
  CallRecord,
  ConnectionSettingsInput,
  ConnectionSettingsRecord,
  ConversationRecord,
  ConversationStatus,
  CreateCalendarNoteInput,
  CreateCallInput,
  CustomerRecord,
  DemoCallLeadRecord,
  FollowUpContact,
  GatewayProvider,
  InboxConversation,
  MessageMetadata,
  MessageRecord,
  MessageStatus,
  MessagingChannel,
  NormalizedPaymentEvent,
  PaymentAttemptRecord,
  PaymentRecord,
  QuizLeadRecord,
  QueueJobRecord,
  QueueOverviewSnapshot,
  RecoveryAnalytics,
  RecoveryLeadRecord,
  RecoveryLeadStatus,
  SellerAdminControlInput,
  SellerAdminControlRecord,
  SellerInviteInput,
  SellerInviteRecord,
  SellerUserInput,
  SellerUserRecord,
  SystemLogRecord,
  UpdateCallInput,
  WebhookEventRecord,
  WhitelabelProfileInput,
  WhitelabelProfileRecord,
  OptOutRecord,
  OptOutInput,
  FrequencyLogRecord,
  FrequencyLogInput,
  FrequencyCheck,
  MessageTemplateRecord,
  MessageTemplateInput,
  ABTestRecord,
  ABTestInput,
  ABTestAssignmentRecord,
  RecoveryFunnelSnapshot,
} from "@/server/recovery/types";
import { RecoveryStorage } from "@/server/recovery/services/storage";

interface PaymentAnalyticsData {
  amount: string | number;
  first_failure_at: string | null;
  recovered_at: string | null;
}

/**
 * Retry wrapper for Supabase operations that may fail transiently.
 * Retries once with 1s delay on network/timeout errors.
 * Does NOT retry on 4xx status codes (client errors).
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  label = "supabase_operation",
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const isTransient =
      error instanceof TypeError || // network error (fetch)
      (error instanceof Error &&
        (error.message.includes("timeout") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("fetch failed") ||
          error.message.includes("network")));

    // Don't retry on 4xx / non-transient errors
    if (!isTransient) throw error;

    console.warn(
      `[withRetry] Transient error in ${label}, retrying in 1s:`,
      error instanceof Error ? error.message : error,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
    return operation();
  }
}

type DatabaseAgentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  created_at: string;
  last_assigned_at?: string | null;
};

type DatabaseCustomerRow = {
  id: string;
  gateway_customer_id?: string | null;
  name: string;
  email: string;
  phone: string;
  document?: string | null;
  created_at: string;
  updated_at: string;
};

type DatabasePaymentRow = {
  id: string;
  gateway_payment_id: string;
  order_id: string;
  customer_id: string;
  status: string;
  amount: string | number;
  currency: string;
  payment_method: string;
  failure_code?: string | null;
  created_at: string;
  updated_at: string;
  first_failure_at?: string | null;
  recovered_at?: string | null;
};

type DatabasePaymentAttemptRow = {
  id: string;
  payment_id: string;
  attempt_number: number;
  status: string;
  failure_reason?: string | null;
  payment_link: string;
  created_at: string;
};

type DatabaseWebhookEventRow = {
  id: string;
  webhook_id: string;
  event_id: string;
  event_type: string;
  payload: unknown;
  processed: boolean;
  duplicate: boolean;
  error?: string | null;
  source: string;
  created_at: string;
  processed_at?: string | null;
};

type DatabaseLeadRow = {
  id: string;
  payment_id: string;
  customer_id: string;
  lead_id: string;
  customer_name: string;
  email: string;
  phone: string;
  payment_value: string | number;
  product?: string | null;
  failure_reason?: string | null;
  status: RecoveryLeadStatus;
  assigned_agent_id?: string | null;
  created_at: string;
  updated_at: string;
  recovered_at?: string | null;
  payment?: DatabasePaymentRow | DatabasePaymentRow[] | null;
  agent?: DatabaseAgentRow | DatabaseAgentRow[] | null;
};

type DatabaseConversationRow = {
  id: string;
  lead_record_id?: string | null;
  lead_public_id?: string | null;
  customer_id?: string | null;
  customer_name: string;
  channel: MessagingChannel;
  contact_value: string;
  assigned_agent_id?: string | null;
  status: ConversationStatus;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  agent?: DatabaseAgentRow | DatabaseAgentRow[] | null;
};

type DatabaseMessageRow = {
  id: string;
  conversation_id: string;
  lead_record_id?: string | null;
  lead_public_id?: string | null;
  customer_id?: string | null;
  channel: MessagingChannel;
  direction: "inbound" | "outbound";
  sender_name?: string | null;
  sender_address: string;
  content: string;
  provider_message_id?: string | null;
  status: MessageStatus;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  error?: string | null;
  metadata?: MessageMetadata | null;
};

type DatabaseQueueJobRow = {
  id: string;
  queue_name: QueueJobRecord["queueName"];
  job_type: string;
  payload: Record<string, unknown>;
  run_at: string;
  attempts: number;
  status: QueueJobRecord["status"];
  error?: string | null;
  created_at: string;
};

type DatabaseSystemLogRow = {
  id: string;
  event_type: SystemLogRecord["eventType"];
  level: SystemLogRecord["level"];
  message: string;
  context: Record<string, unknown>;
  created_at: string;
};

type DatabaseConnectionSettingsRow = {
  id: string;
  app_base_url: string;
  webhook_secret: string;
  webhook_tolerance_seconds: number;
  whatsapp_provider: string;
  whatsapp_api_base_url: string | null;
  whatsapp_access_token: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  whatsapp_webhook_verify_token: string | null;
  whatsapp_web_session_id: string | null;
  whatsapp_web_session_status: string | null;
  whatsapp_web_session_qr_code: string | null;
  whatsapp_web_session_phone: string | null;
  whatsapp_web_session_error: string | null;
  whatsapp_web_session_updated_at: string | null;
  email_provider: string;
  email_api_key: string | null;
  email_from_address: string | null;
  crm_api_url: string | null;
  crm_api_key: string | null;
  openai_api_key: string | null;
  updated_at: string;
};

type DatabaseCalendarNoteRow = {
  id: string;
  date: string;
  lane: CalendarNoteRecord["lane"];
  title: string;
  content?: string | null;
  created_by_email: string;
  created_by_role: CalendarNoteRecord["createdByRole"];
  created_at: string;
  updated_at: string;
};

type DatabaseSellerAdminControlRow = {
  id: string;
  seller_key: string;
  seller_name: string;
  seller_email?: string | null;
  active: boolean;
  recovery_target_percent: string | number;
  reported_recovery_rate_percent?: string | number | null;
  max_assigned_leads: number;
  inbox_enabled: boolean;
  automations_enabled: boolean;
  autonomy_mode: SellerAdminControlRecord["autonomyMode"];
  messaging_approach?: SellerAdminControlRecord["messagingApproach"] | null;
  gateway_slug?: string | null;
  gateway_api_key?: string | null;
  whitelabel_id?: string | null;
  checkout_url?: string | null;
  checkout_api_key?: string | null;
  notes?: string | null;
  updated_at: string;
};

type DatabaseSellerUserRow = {
  id: string;
  email: string;
  display_name: string;
  agent_name: string;
  password_hash: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
};

type DatabaseSellerInviteRow = {
  id: string;
  token: string;
  email: string;
  suggested_display_name?: string | null;
  agent_name?: string | null;
  note?: string | null;
  created_by_email: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  updated_at: string;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
};

type DatabaseWhitelabelProfileRow = {
  id: string;
  name: string;
  slug: string;
  gateway_provider: string;
  gateway_base_url: string;
  gateway_docs_url: string;
  gateway_webhook_path: string;
  checkout_url: string;
  checkout_api_key: string;
  brand_accent: string;
  brand_logo: string;
  active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

type DatabaseDemoCallLeadRow = {
  id: string;
  name: string;
  phone: string;
  called_at?: string | null;
  vapi_call_id?: string | null;
  status: string;
  created_at: string;
};

export class SupabaseStorageService implements RecoveryStorage {
  readonly mode = "supabase" as const;
  private readonly supabase: SupabaseClient;

  constructor(input?: { supabaseUrl: string; supabaseServiceRoleKey: string }) {
    const supabaseUrl = input?.supabaseUrl ?? appEnv.supabaseUrl;
    const supabaseServiceRoleKey =
      input?.supabaseServiceRoleKey ?? appEnv.supabaseServiceRoleKey;

    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  async clearOperationalData(): Promise<void> {
    await this.supabase.from("calendar_notes").delete().not("id", "is", null);
    await this.supabase.from("messages").delete().not("id", "is", null);
    await this.supabase.from("conversations").delete().not("id", "is", null);
    await this.supabase.from("payment_attempts").delete().not("id", "is", null);
    await this.supabase.from("queue_jobs").delete().not("id", "is", null);
    await this.supabase.from("system_logs").delete().not("id", "is", null);
    await this.supabase.from("webhook_events").delete().not("id", "is", null);
    await this.supabase.from("recovery_leads").delete().not("id", "is", null);
    await this.supabase.from("payments").delete().not("id", "is", null);
    await this.supabase.from("customers").delete().not("id", "is", null);
  }

  async findWebhookByWebhookId(webhookId: string): Promise<WebhookEventRecord | undefined> {
    const { data, error } = await this.supabase
      .from("webhook_events")
      .select("*")
      .eq("webhook_id", webhookId)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapWebhookEvent(data);
  }

  async createWebhookEvent(input: {
    webhookId: string;
    eventId: string;
    eventType: string;
    source?: string;
    payload: unknown;
  }): Promise<WebhookEventRecord & { alreadyExisted?: boolean }> {
    // Atomic upsert on webhook_id to prevent race-condition duplicates.
    // If a row with the same webhook_id already exists the insert is
    // skipped (ignoreDuplicates) and we return the existing row.
    const { data, error } = await this.supabase
      .from("webhook_events")
      .upsert(
        {
          webhook_id: input.webhookId,
          event_id: input.eventId,
          event_type: input.eventType,
          source: input.source ?? platformBrand.gateway.slug,
          payload: input.payload,
        },
        { onConflict: "webhook_id", ignoreDuplicates: true },
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to create webhook event: ${error.message}`);

    const record = mapWebhookEvent(data);
    const ageMs = Date.now() - new Date(record.createdAt).getTime();
    return { ...record, alreadyExisted: ageMs > 5_000 };
  }

  async listWebhookEvents(limit = 100): Promise<WebhookEventRecord[]> {
    const { data, error } = await this.supabase
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(mapWebhookEvent);
  }

  async markWebhookProcessed(input: {
    webhookRecordId: string;
    eventId: string;
    eventType: string;
  }): Promise<void> {
    await this.supabase
      .from("webhook_events")
      .update({
        processed: true,
        event_id: input.eventId,
        event_type: input.eventType,
        processed_at: new Date().toISOString(),
      })
      .eq("id", input.webhookRecordId);
  }

  async markWebhookFailed(webhookRecordId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from("webhook_events")
      .update({
        error: errorMessage,
        processed_at: new Date().toISOString(),
      })
      .eq("id", webhookRecordId);
  }

  async upsertCustomer(normalizedEvent: NormalizedPaymentEvent): Promise<CustomerRecord> {
    const normalizedPhone = normalizePhone(normalizedEvent.customer.phone);

    // Prefer exact gateway_customer_id match, then fall back to email match
    const { data: byGatewayId } = await this.supabase
      .from("customers")
      .select("*")
      .eq("gateway_customer_id", normalizedEvent.customer.id)
      .limit(1);

    const existing = byGatewayId?.[0] ?? null;

    if (existing) {
      const updatePayload: Record<string, unknown> = {
        name: normalizedEvent.customer.name,
        email: normalizedEvent.customer.email,
        phone: normalizedPhone,
        updated_at: new Date().toISOString(),
      };
      if (normalizedEvent.customer.document) {
        updatePayload.document = normalizedEvent.customer.document;
      }
      const { data, error } = await this.supabase
        .from("customers")
        .update(updatePayload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update customer: ${error.message}`);
      return mapCustomer(data);
    }

    // Check by email as fallback — but don't change its gateway_customer_id
    const { data: byEmail } = await this.supabase
      .from("customers")
      .select("*")
      .eq("email", normalizedEvent.customer.email)
      .limit(1);

    const emailMatch = byEmail?.[0] ?? null;

    if (emailMatch) {
      const emailUpdatePayload: Record<string, unknown> = {
        name: normalizedEvent.customer.name,
        phone: normalizedPhone,
        updated_at: new Date().toISOString(),
      };
      if (normalizedEvent.customer.document) {
        emailUpdatePayload.document = normalizedEvent.customer.document;
      }
      const { data, error } = await this.supabase
        .from("customers")
        .update(emailUpdatePayload)
        .eq("id", emailMatch.id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update customer by email: ${error.message}`);
      return mapCustomer(data);
    }

    // Insert new customer
    const insertPayload: Record<string, unknown> = {
      gateway_customer_id: normalizedEvent.customer.id,
      name: normalizedEvent.customer.name,
      email: normalizedEvent.customer.email,
      phone: normalizedPhone,
    };
    if (normalizedEvent.customer.document) {
      insertPayload.document = normalizedEvent.customer.document;
    }
    const { data, error } = await this.supabase
      .from("customers")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw new Error(`Failed to insert customer: ${error.message}`);
    return mapCustomer(data);
  }

  async upsertPayment(
    normalizedEvent: NormalizedPaymentEvent,
    customerId: string,
  ): Promise<PaymentRecord> {
    const markAsFailure =
      normalizedEvent.event_type === "payment_failed" ||
      normalizedEvent.event_type === "payment_refused" ||
      normalizedEvent.event_type === "payment_expired";

    const { data: paymentRows } = await this.supabase
      .from("payments")
      .select("*")
      .or(`gateway_payment_id.eq.${sanitizeFilterValue(normalizedEvent.payment.id)},order_id.eq.${sanitizeFilterValue(normalizedEvent.payment.order_id)}`)
      .order("created_at", { ascending: true })
      .limit(1);

    const existing = paymentRows?.[0] ?? null;

    if (existing) {
      const { data, error } = await this.supabase
        .from("payments")
        .update({
          order_id: normalizedEvent.payment.order_id,
          customer_id: customerId,
          status: normalizedEvent.payment.status,
          amount: normalizedEvent.payment.amount,
          currency: normalizedEvent.payment.currency,
          payment_method: normalizedEvent.payment.method,
          failure_code: normalizedEvent.payment.failure_code,
          first_failure_at: markAsFailure && !existing.first_failure_at ? new Date().toISOString() : existing.first_failure_at,
          recovered_at: normalizedEvent.event_type === "payment_succeeded" && existing.first_failure_at ? new Date().toISOString() : existing.recovered_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update payment: ${error.message}`);
      return mapPayment(data);
    } else {
      const insertPayload = {
        gateway_payment_id: normalizedEvent.payment.id,
        order_id: normalizedEvent.payment.order_id,
        customer_id: customerId,
        status: normalizedEvent.payment.status,
        amount: normalizedEvent.payment.amount,
        currency: normalizedEvent.payment.currency,
        payment_method: normalizedEvent.payment.method,
        failure_code: normalizedEvent.payment.failure_code,
        first_failure_at: markAsFailure ? new Date().toISOString() : null,
        recovered_at: normalizedEvent.event_type === "payment_succeeded" ? new Date().toISOString() : null,
      };
      const { data, error } = await this.supabase
        .from("payments")
        .insert(insertPayload)
        .select()
        .single();
      if (error) {
        // Race condition: another webhook inserted the same payment between our SELECT and INSERT
        if (error.code === "23505" && error.message.includes("gateway_payment_id")) {
          const { data: raceExisting } = await this.supabase
            .from("payments")
            .select("*")
            .eq("gateway_payment_id", normalizedEvent.payment.id)
            .single();
          if (raceExisting) {
            const { data: updated, error: updateError } = await this.supabase
              .from("payments")
              .update({
                order_id: normalizedEvent.payment.order_id,
                customer_id: customerId,
                status: normalizedEvent.payment.status,
                amount: normalizedEvent.payment.amount,
                currency: normalizedEvent.payment.currency,
                payment_method: normalizedEvent.payment.method,
                failure_code: normalizedEvent.payment.failure_code,
                first_failure_at: markAsFailure && !raceExisting.first_failure_at ? new Date().toISOString() : raceExisting.first_failure_at,
                recovered_at: normalizedEvent.event_type === "payment_succeeded" && raceExisting.first_failure_at ? new Date().toISOString() : raceExisting.recovered_at,
                updated_at: new Date().toISOString(),
              })
              .eq("id", raceExisting.id)
              .select()
              .single();
            if (updateError) throw new Error(`Failed to update payment after race: ${updateError.message}`);
            return mapPayment(updated);
          }
        }
        throw new Error(`Failed to insert payment: ${error.message}`);
      }
      return mapPayment(data);
    }
  }

  async findPayment(input: {
    paymentId?: string;
    gatewayPaymentId?: string;
    orderId?: string;
  }): Promise<PaymentRecord | undefined> {
    const conditions = [];
    if (input.paymentId) conditions.push(`id.eq.${sanitizeUuidFilterValue(input.paymentId)}`);
    if (input.gatewayPaymentId) conditions.push(`gateway_payment_id.eq.${sanitizeFilterValue(input.gatewayPaymentId)}`);
    if (input.orderId) conditions.push(`order_id.eq.${sanitizeFilterValue(input.orderId)}`);

    if (conditions.length === 0) return undefined;

    const { data } = await this.supabase
      .from("payments")
      .select("*")
      .or(conditions.join(","))
      .maybeSingle();
    return data ? mapPayment(data) : undefined;
  }

  async findCustomer(customerId: string): Promise<CustomerRecord | undefined> {
    const { data } = await this.supabase.from("customers").select("*").eq("id", customerId).maybeSingle();
    return data ? mapCustomer(data) : undefined;
  }

  async findLeadByLeadId(leadId: string): Promise<RecoveryLeadRecord | undefined> {
    const { data } = await this.supabase
      .from("recovery_leads")
      .select("*, agent:agents(*)")
      .eq("lead_id", leadId)
      .maybeSingle();

    return data ? mapLead(data as DatabaseLeadRow) : undefined;
  }

  async findLeadByContact(input: {
    phone?: string;
    email?: string;
  }): Promise<RecoveryLeadRecord | undefined> {
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedEmail = normalizeEmail(input.email);

    if (normalizedEmail) {
      const { data } = await this.supabase
        .from("recovery_leads")
        .select("*, agent:agents(*)")
        .eq("email", normalizedEmail)
        .not("status", "in", '("RECOVERED","LOST")')
        .order("updated_at", { ascending: false })
        .limit(1);

      const lead = ((data as DatabaseLeadRow[] | null) || [])[0];

      if (lead) {
        return mapLead(lead);
      }
    }

    if (!normalizedPhone) {
      return undefined;
    }

    // Try exact match on the normalized phone value first
    const { data: exactMatch } = await this.supabase
      .from("recovery_leads")
      .select("*, agent:agents(*)")
      .eq("phone", normalizedPhone)
      .not("status", "in", '("RECOVERED","LOST")')
      .order("updated_at", { ascending: false })
      .limit(1);

    const exactLead = ((exactMatch as DatabaseLeadRow[] | null) || [])[0];
    if (exactLead) {
      return mapLead(exactLead);
    }

    // Fallback: fuzzy match with LIKE on last digits (handles formatting differences)
    const lastDigits = normalizedPhone.replace(/\D/g, "").slice(-8);
    if (lastDigits.length < 8) return undefined;

    const { data: fuzzyMatch } = await this.supabase
      .from("recovery_leads")
      .select("*, agent:agents(*)")
      .like("phone", `%${sanitizeFilterValue(lastDigits)}`)
      .not("status", "in", '("RECOVERED","LOST")')
      .order("updated_at", { ascending: false })
      .limit(10);

    const lead = ((fuzzyMatch as DatabaseLeadRow[] | null) || []).find((item) => {
      return normalizePhone(item.phone) === normalizedPhone;
    });

    return lead ? mapLead(lead) : undefined;
  }

  async ensureAgent(input: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<AgentRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name.trim().toLowerCase();
    const normalizedPhone = normalizePhone(input.phone);

    const { data: existingByEmail } = await this.supabase
      .from("agents")
      .select("*")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    const existing =
      existingByEmail ??
      (
        await this.supabase
          .from("agents")
          .select("*")
          .ilike("name", normalizedName)
          .maybeSingle()
      ).data ??
      null;

    if (existing) {
      const { data, error } = await this.supabase
        .from("agents")
        .update({
          name: input.name,
          email: input.email,
          phone: normalizedPhone || existing.phone || "",
          active: true,
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapAgent(data);
    }

    const { data, error } = await this.supabase
      .from("agents")
      .insert({
        name: input.name,
        email: input.email,
        phone: normalizedPhone,
        active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return mapAgent(data);
  }

  async getActiveAgents(): Promise<AgentRecord[]> {
    const { data } = await this.supabase.from("agents").select("*").eq("active", true).order("created_at", { ascending: true });
    return (data || []).map(mapAgent);
  }

  /**
   * Resolve an agent's database ID from their display name.
   * Used for seller-scoped queries that filter by assigned_agent_id.
   * Returns undefined when no agent matches.
   */
  private async resolveAgentIdByName(agentName: string): Promise<string | undefined> {
    const { data } = await this.supabase
      .from("agents")
      .select("id")
      .ilike("name", agentName.trim().toLowerCase())
      .maybeSingle();
    return data?.id ?? undefined;
  }

  async assignAgentRoundRobin(): Promise<AgentRecord | undefined> {
    const { data: fullAgents } = await this.supabase
      .from("agents")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (!fullAgents || fullAgents.length === 0) return undefined;

    const chosenAgent = (fullAgents as DatabaseAgentRow[]).reduce((chosen, current) => {
      const chosenLastAssignedAt = chosen.last_assigned_at ?? null;
      const currentLastAssignedAt = current.last_assigned_at ?? null;

      if (!chosenLastAssignedAt && currentLastAssignedAt) return chosen;
      if (chosenLastAssignedAt && !currentLastAssignedAt) return current;
      if (!chosenLastAssignedAt && !currentLastAssignedAt) {
        return chosen.created_at <= current.created_at ? chosen : current;
      }

      if (chosenLastAssignedAt && currentLastAssignedAt) {
        return new Date(chosenLastAssignedAt) <= new Date(currentLastAssignedAt)
          ? chosen
          : current;
      }

      return chosen;
    });

    const { data } = await this.supabase
      .from("agents")
      .update({ last_assigned_at: new Date().toISOString() })
      .eq("id", chosenAgent.id)
      .select()
      .single();
    return mapAgent(data);
  }

  async upsertLead(input: {
    payment: PaymentRecord;
    customer: CustomerRecord;
    status: RecoveryLeadStatus;
    product?: string;
    failureReason?: string;
    assignedAgent?: AgentRecord;
  }): Promise<RecoveryLeadRecord> {
    const { data: existing } = await this.supabase
      .from("recovery_leads")
      .select("*, agent:agents(*)")
      .eq("payment_id", input.payment.id)
      .maybeSingle();

    const assignedAgentId = existing?.assigned_agent_id ?? input.assignedAgent?.id ?? null;
    const normalizedPhone = normalizePhone(input.customer.phone);

    if (existing) {
      const { data, error } = await this.supabase
        .from("recovery_leads")
        .update({
          customer_name: input.customer.name,
          email: input.customer.email,
          phone: normalizedPhone,
          payment_value: input.payment.amount,
          product: input.product,
          failure_reason: input.failureReason,
          status:
            existing.status === "RECOVERED" || existing.status === "CONTACTING"
              ? existing.status
              : input.status,
          assigned_agent_id: assignedAgentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*, agent:agents(*)")
        .single();
      if (error) throw error;
      return mapLead(data);
    } else {
      const { data, error } = await this.supabase
        .from("recovery_leads")
        .insert({
          lead_id: `lead_${input.payment.gatewayPaymentId}`,
          payment_id: input.payment.id,
          customer_id: input.customer.id,
          customer_name: input.customer.name,
          email: input.customer.email,
          phone: normalizedPhone,
          payment_value: input.payment.amount,
          product: input.product,
          failure_reason: input.failureReason,
          status: input.status,
          assigned_agent_id: assignedAgentId,
        })
        .select("*, agent:agents(*)")
        .single();
      if (error) throw error;
      return mapLead(data);
    }
  }

  async markLeadRecovered(paymentId: string): Promise<RecoveryLeadRecord | undefined> {
    const { data: lead } = await this.supabase.from("recovery_leads").select("*").eq("payment_id", paymentId).maybeSingle();
    if (!lead) return undefined;

    const { data } = await this.supabase
      .from("recovery_leads")
      .update({ status: "RECOVERED", recovered_at: new Date().toISOString() })
      .eq("id", lead.id)
      .select("*, agent:agents(*)")
      .single();
    return mapLead(data);
  }

  async markLeadLost(paymentId: string): Promise<RecoveryLeadRecord | undefined> {
    const { data: lead } = await this.supabase.from("recovery_leads").select("*").eq("payment_id", paymentId).maybeSingle();
    if (!lead) return undefined;

    const { data } = await this.supabase
      .from("recovery_leads")
      .update({ status: "LOST" })
      .eq("id", lead.id)
      .select("*, agent:agents(*)")
      .single();
    return mapLead(data);
  }

  async updateLeadStatus(input: {
    leadId: string;
    status: RecoveryLeadStatus;
    assignedAgent?: AgentRecord;
  }): Promise<RecoveryLeadRecord | undefined> {
    const updatedAt = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("recovery_leads")
      .update({
        status: input.status,
        assigned_agent_id: input.assignedAgent?.id ?? undefined,
        updated_at: updatedAt,
      })
      .eq("lead_id", input.leadId)
      .select("*, agent:agents(*)")
      .maybeSingle();

    if (error || !data) return undefined;

    await this.supabase
      .from("conversations")
      .update({
        assigned_agent_id: input.assignedAgent?.id ?? undefined,
        updated_at: updatedAt,
      })
      .eq("lead_public_id", input.leadId);

    return mapLead(data);
  }

  async createQueueJobs(jobs: QueueJobRecord[]): Promise<QueueJobRecord[]> {
    if (!jobs.length) return [];
    
    const { error } = await this.supabase.from("queue_jobs").insert(
      jobs.map(job => ({
        id: job.id,
        queue_name: job.queueName,
        job_type: job.jobType,
        payload: job.payload,
        run_at: new Date(job.runAt).toISOString(),
        attempts: job.attempts,
        status: job.status,
        created_at: new Date(job.createdAt).toISOString(),
        error: job.error,
      }))
    );
    if (error) throw error;
    return jobs;
  }

  async getQueueOverview(): Promise<QueueOverviewSnapshot> {
    const now = new Date().toISOString();
    const [
      scheduledCount,
      processingCount,
      processedCount,
      failedCount,
      dueNowCount,
      oldestScheduled,
      oldestDue,
    ] = await Promise.all([
      this.supabase
        .from("queue_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "scheduled"),
      this.supabase
        .from("queue_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "processing"),
      this.supabase
        .from("queue_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "processed"),
      this.supabase
        .from("queue_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed"),
      this.supabase
        .from("queue_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "scheduled")
        .lte("run_at", now),
      this.supabase
        .from("queue_jobs")
        .select("run_at")
        .eq("status", "scheduled")
        .order("run_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      this.supabase
        .from("queue_jobs")
        .select("run_at")
        .eq("status", "scheduled")
        .lte("run_at", now)
        .order("run_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      scheduled: scheduledCount.count ?? 0,
      processing: processingCount.count ?? 0,
      processed: processedCount.count ?? 0,
      failed: failedCount.count ?? 0,
      dueNow: dueNowCount.count ?? 0,
      oldestScheduledAt:
        oldestScheduled.data && "run_at" in oldestScheduled.data
          ? String(oldestScheduled.data.run_at)
          : undefined,
      oldestDueAt:
        oldestDue.data && "run_at" in oldestDue.data
          ? String(oldestDue.data.run_at)
          : undefined,
    };
  }

  async claimDueQueueJobs(input?: {
    limit?: number;
    runUntil?: string;
  }): Promise<QueueJobRecord[]> {
    const limit = input?.limit ?? 20;
    const runUntil = input?.runUntil ?? new Date().toISOString();
    const selectionWindow = Math.min(Math.max(limit * 4, limit), 500);

    const { data, error } = await withRetry(
      async () =>
        this.supabase
          .from("queue_jobs")
          .select("*")
          .eq("status", "scheduled")
          .lte("run_at", runUntil)
          .order("run_at", { ascending: true })
          .limit(selectionWindow),
      "claimDueQueueJobs",
    );

    if (error || !data?.length) {
      return [];
    }

    const claimedJobs: QueueJobRecord[] = [];
    const prioritizedRows = [...(data as DatabaseQueueJobRow[])].sort((left, right) => {
      const priorityDifference =
        queueJobPriority(left.job_type) - queueJobPriority(right.job_type);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return new Date(left.run_at).getTime() - new Date(right.run_at).getTime();
    });

    for (const row of prioritizedRows.slice(0, limit)) {
      const { data: claimed, error: claimError } = await this.supabase
        .from("queue_jobs")
        .update({
          status: "processing",
          error: null,
        })
        .eq("id", row.id)
        .eq("status", "scheduled")
        .select("*")
        .maybeSingle();

      if (!claimError && claimed) {
        claimedJobs.push(mapQueueJob(claimed));
      }
    }

    return claimedJobs;
  }

  async completeQueueJob(jobId: string): Promise<void> {
    await withRetry(
      async () =>
        this.supabase
          .from("queue_jobs")
          .update({
            status: "processed",
            error: null,
          })
          .eq("id", jobId),
      "completeQueueJob",
    );
  }

  async rescheduleQueueJobFailure(input: {
    jobId: string;
    error: string;
    remainingAttempts: number;
    nextRunAt?: string;
  }): Promise<QueueJobRecord | undefined> {
    const update =
      input.remainingAttempts > 0 && input.nextRunAt
        ? {
            status: "scheduled" as const,
            attempts: input.remainingAttempts,
            run_at: input.nextRunAt,
            error: input.error,
          }
        : {
            status: "failed" as const,
            attempts: Math.max(0, input.remainingAttempts),
            error: input.error,
          };

    const { data, error } = await withRetry(
      async () =>
        this.supabase
          .from("queue_jobs")
          .update(update)
          .eq("id", input.jobId)
          .select("*")
          .maybeSingle(),
      "rescheduleQueueJobFailure",
    );

    if (error || !data) return undefined;
    return mapQueueJob(data);
  }

  async hasScheduledJobsForLead(leadId: string, jobType: string): Promise<boolean> {
    const { count } = await this.supabase
      .from("queue_jobs")
      .select("*", { count: "exact", head: true })
      .eq("job_type", jobType)
      .in("status", ["scheduled", "processing"])
      .contains("payload", { leadId });
    return (count ?? 0) > 0;
  }

  async createPaymentAttempt(input: {
    paymentId: string;
    paymentLink: string;
    failureReason?: string;
  }): Promise<PaymentAttemptRecord> {
    const { count } = await this.supabase.from("payment_attempts").select("*", { count: "exact", head: true }).eq("payment_id", input.paymentId);
    const attemptNumber = (count || 0) + 1;

    const { data, error } = await this.supabase.from("payment_attempts").insert({
      payment_id: input.paymentId,
      attempt_number: attemptNumber,
      status: "retry_generated",
      failure_reason: input.failureReason,
      payment_link: input.paymentLink,
    }).select().single();
    if (error) throw error;
    return mapPaymentAttempt(data);
  }

  async upsertConversation(input: {
    channel: MessagingChannel;
    contactValue: string;
    customerName: string;
    lead?: RecoveryLeadRecord;
    customerId?: string;
  }): Promise<ConversationRecord> {
    const timestamp = new Date().toISOString();
    const normalizedContact = normalizeContactValue(input.channel, input.contactValue);

    const { data: exactExisting } = await this.supabase
      .from("conversations")
      .select("*, agent:agents(*)")
      .eq("channel", input.channel)
      .eq("contact_value", normalizedContact)
      .maybeSingle();

    let existing = exactExisting;

    if (!existing && (input.channel === "whatsapp" || input.channel === "sms")) {
      const { data: legacyCandidates } = await this.supabase
        .from("conversations")
        .select("*, agent:agents(*)")
        .eq("channel", input.channel)
        .order("updated_at", { ascending: false });

      existing =
        ((legacyCandidates as DatabaseConversationRow[] | null) || []).find((item) => {
          return normalizeContactValue(item.channel, item.contact_value) === normalizedContact;
        }) ?? null;
    }

    if (existing) {
      const { data, error } = await this.supabase
        .from("conversations")
        .update({
          lead_record_id: input.lead?.id ?? existing.lead_record_id,
          lead_public_id: input.lead?.leadId ?? existing.lead_public_id,
          customer_id: input.customerId ?? input.lead?.customerId ?? existing.customer_id,
          customer_name: input.customerName || existing.customer_name,
          assigned_agent_id: input.lead?.assignedAgentId ?? existing.assigned_agent_id,
          status: existing.status === "closed" ? "open" : existing.status,
          updated_at: timestamp,
        })
        .eq("id", existing.id)
        .select("*, agent:agents(*)")
        .single();

      if (error) throw error;
      return mapConversation(data);
    }

    const { data, error } = await this.supabase
      .from("conversations")
      .insert({
        lead_record_id: input.lead?.id,
        lead_public_id: input.lead?.leadId,
        customer_id: input.customerId ?? input.lead?.customerId ?? null,
        customer_name: input.customerName,
        channel: input.channel,
        contact_value: normalizedContact,
        assigned_agent_id: input.lead?.assignedAgentId ?? null,
        status: "open",
        last_message_at: timestamp,
      })
      .select("*, agent:agents(*)")
      .single();

    if (error) throw error;
    return mapConversation(data);
  }

  async findConversationById(
    conversationId: string,
  ): Promise<ConversationRecord | undefined> {
    const { data, error } = await this.supabase
      .from("conversations")
      .select("*, agent:agents(*)")
      .eq("id", conversationId)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapConversation(data);
  }

  async updateConversationStatus(input: {
    conversationId: string;
    status: ConversationStatus;
  }): Promise<ConversationRecord | undefined> {
    const { data, error } = await this.supabase
      .from("conversations")
      .update({
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.conversationId)
      .select("*, agent:agents(*)")
      .maybeSingle();

    if (error || !data) return undefined;
    return mapConversation(data);
  }

  async createMessage(input: {
    conversationId: string;
    channel: MessagingChannel;
    direction: "inbound" | "outbound";
    senderAddress: string;
    content: string;
    status: MessageStatus;
    lead?: RecoveryLeadRecord;
    customerId?: string;
    senderName?: string;
    providerMessageId?: string;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
    metadata?: MessageMetadata;
  }): Promise<MessageRecord> {
    const timestamp = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        lead_record_id: input.lead?.id ?? null,
        lead_public_id: input.lead?.leadId ?? null,
        customer_id: input.customerId ?? input.lead?.customerId ?? null,
        channel: input.channel,
        direction: input.direction,
        sender_name: input.senderName ?? null,
        sender_address: input.senderAddress,
        content: input.content,
        provider_message_id: input.providerMessageId ?? null,
        status: input.status,
        delivered_at: input.deliveredAt ?? null,
        read_at: input.readAt ?? null,
        error: input.error ?? null,
        metadata: input.metadata ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    await this.supabase
      .from("conversations")
      .update({
        last_message_at: timestamp,
        updated_at: timestamp,
      })
      .eq("id", input.conversationId);

    return mapMessage(data);
  }

  async updateMessageStatus(input: {
    providerMessageId: string;
    status: MessageStatus;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
  }): Promise<MessageRecord | undefined> {
    const { data, error } = await this.supabase
      .from("messages")
      .update({
        status: input.status,
        delivered_at: input.deliveredAt ?? null,
        read_at: input.readAt ?? null,
        error: input.error ?? null,
      })
      .eq("provider_message_id", input.providerMessageId)
      .select()
      .maybeSingle();

    if (error || !data) return undefined;
    return mapMessage(data);
  }

  async updateMessageById(input: {
    messageId: string;
    status: MessageStatus;
    providerMessageId?: string;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
  }): Promise<MessageRecord | undefined> {
    const { data, error } = await this.supabase
      .from("messages")
      .update({
        status: input.status,
        provider_message_id: input.providerMessageId ?? undefined,
        delivered_at: input.deliveredAt ?? undefined,
        read_at: input.readAt ?? undefined,
        error: input.error ?? undefined,
      })
      .eq("id", input.messageId)
      .select()
      .maybeSingle();

    if (error || !data) return undefined;
    return mapMessage(data);
  }

  async addLog(log: SystemLogRecord): Promise<void> {
    try {
      await this.supabase.from("system_logs").insert({
        id: log.id,
        event_type: log.eventType,
        level: log.level,
        message: log.message,
        context: log.context,
        created_at: new Date(log.createdAt).toISOString(),
      });
    } catch (e) {
      console.error("Failed to write log:", e);
    }
  }

  async getCalendarSnapshot(input: {
    month: string;
    visibleLeadIds?: string[];
  }): Promise<CalendarSnapshot> {
    const month = normalizeMonthKey(input.month);
    const { start, endExclusive, dateKeys } = getMonthRange(month);

    let leadsQuery = this.supabase
      .from("recovery_leads")
      .select("*, agent:agents(*)");

    if (input.visibleLeadIds) {
      if (input.visibleLeadIds.length === 0) {
        leadsQuery = this.supabase
          .from("recovery_leads")
          .select("*, agent:agents(*)")
          .eq("lead_id", "__no_visible_leads__");
      } else {
        leadsQuery = leadsQuery.in("lead_id", input.visibleLeadIds);
      }
    }

    const { data: leadsData } = await leadsQuery;
    const leads = ((leadsData as DatabaseLeadRow[] | null) || []).map(mapLead);
    const paymentIds = [...new Set(leads.map((lead) => lead.paymentId))];

    const [paymentsResult, messagesResult, conversationsResult, queueJobsResult, notesResult] =
      await Promise.all([
        paymentIds.length
          ? this.supabase.from("payments").select("*").in("id", paymentIds)
          : Promise.resolve({ data: [] as DatabasePaymentRow[] | null }),
        this.supabase
          .from("messages")
          .select("*")
          .gte("created_at", start.toISOString())
          .lt("created_at", endExclusive.toISOString())
          .order("created_at", { ascending: false }),
        this.supabase.from("conversations").select("*, agent:agents(*)"),
        this.supabase
          .from("queue_jobs")
          .select("*")
          .gte("run_at", start.toISOString())
          .lt("run_at", endExclusive.toISOString())
          .order("run_at", { ascending: false }),
        this.supabase
          .from("calendar_notes")
          .select("*")
          .gte("date", dateKeys[0])
          .lte("date", dateKeys[dateKeys.length - 1])
          .order("updated_at", { ascending: false }),
      ]);

    return buildCalendarSnapshot({
      month,
      visibleLeadIds: input.visibleLeadIds,
      leads,
      payments: ((paymentsResult.data as DatabasePaymentRow[] | null) || []).map(mapPayment),
      queueJobs: ((queueJobsResult.data as DatabaseQueueJobRow[] | null) || []).map(
        mapQueueJob,
      ),
      messages: ((messagesResult.data as DatabaseMessageRow[] | null) || []).map(mapMessage),
      conversations: ((conversationsResult.data as DatabaseConversationRow[] | null) || []).map(
        mapConversation,
      ),
      calendarNotes: ((notesResult.data as DatabaseCalendarNoteRow[] | null) || []).map(
        mapCalendarNote,
      ),
    });
  }

  async createCalendarNote(
    input: CreateCalendarNoteInput,
  ): Promise<CalendarNoteRecord> {
    const { data, error } = await this.supabase
      .from("calendar_notes")
      .insert({
        date: normalizeCalendarDate(input.date),
        lane: input.lane,
        title: input.title.trim(),
        content: input.content?.trim() || null,
        created_by_email: input.createdByEmail.trim().toLowerCase(),
        created_by_role: input.createdByRole,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar note: ${error.message}`);
    }

    return mapCalendarNote(data as DatabaseCalendarNoteRow);
  }

  async deleteCalendarNote(noteId: string): Promise<void> {
    const { error } = await this.supabase
      .from("calendar_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      throw new Error(`Failed to delete calendar note: ${error.message}`);
    }
  }

  async getAnalytics(agentName?: string): Promise<RecoveryAnalytics> {
    // When scoped to a seller, filter through recovery_leads → payments
    if (agentName) {
      const agentId = await this.resolveAgentIdByName(agentName);
      if (!agentId) {
        return {
          total_failed_payments: 0,
          recovered_payments: 0,
          recovery_rate: 0,
          recovered_revenue: 0,
          average_recovery_time_hours: 0,
          active_recoveries: 0,
        };
      }

      const { data: leads } = await this.supabase
        .from("recovery_leads")
        .select("payment:payments(amount, first_failure_at, recovered_at)")
        .eq("assigned_agent_id", agentId);
      const { count: activeRecoveries } = await this.supabase
        .from("recovery_leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_agent_id", agentId)
        .not("status", "in", '("RECOVERED","LOST")');

      const paymentList: PaymentAnalyticsData[] = ((leads as { payment: PaymentAnalyticsData | PaymentAnalyticsData[] | null }[] | null) || [])
        .map((l) => {
          const p = Array.isArray(l.payment) ? l.payment[0] : l.payment;
          return p ?? null;
        })
        .filter((p): p is PaymentAnalyticsData => p !== null && p.first_failure_at !== null);

      const failedPayments = paymentList.length;
      const recoveredPayments = paymentList.filter(p => p.recovered_at);
      const recoveredRevenue = recoveredPayments.reduce((sum: number, p: PaymentAnalyticsData) => sum + Number(p.amount), 0);
      const totalRecoveryHours = recoveredPayments.reduce((sum: number, p: PaymentAnalyticsData) => {
        if (!p.first_failure_at || !p.recovered_at) return sum;
        return sum + (new Date(p.recovered_at).getTime() - new Date(p.first_failure_at).getTime()) / 3_600_000;
      }, 0);

      return {
        total_failed_payments: failedPayments,
        recovered_payments: recoveredPayments.length,
        recovery_rate: failedPayments ? Number(((recoveredPayments.length / failedPayments) * 100).toFixed(2)) : 0,
        recovered_revenue: Number(recoveredRevenue.toFixed(2)),
        average_recovery_time_hours: recoveredPayments.length ? Number((totalRecoveryHours / recoveredPayments.length).toFixed(2)) : 0,
        active_recoveries: activeRecoveries || 0,
      };
    }

    const { data: payments } = await this.supabase.from("payments").select("amount, first_failure_at, recovered_at").not("first_failure_at", "is", null);
    const { count: activeRecoveries } = await this.supabase.from("recovery_leads").select("*", { count: "exact", head: true }).not("status", "in", '("RECOVERED","LOST")');

    const paymentList: PaymentAnalyticsData[] = payments || [];
    const failedPayments = paymentList.length;
    const recoveredPayments = paymentList.filter(p => p.recovered_at);
    const recoveredRevenue = recoveredPayments.reduce((sum: number, p: PaymentAnalyticsData) => sum + Number(p.amount), 0);
    const totalRecoveryHours = recoveredPayments.reduce((sum: number, p: PaymentAnalyticsData) => {
      if (!p.first_failure_at || !p.recovered_at) return sum;
      return sum + (new Date(p.recovered_at).getTime() - new Date(p.first_failure_at).getTime()) / 3_600_000;
    }, 0);

    return {
      total_failed_payments: failedPayments,
      recovered_payments: recoveredPayments.length,
      recovery_rate: failedPayments ? Number(((recoveredPayments.length / failedPayments) * 100).toFixed(2)) : 0,
      recovered_revenue: Number(recoveredRevenue.toFixed(2)),
      average_recovery_time_hours: recoveredPayments.length ? Number((totalRecoveryHours / recoveredPayments.length).toFixed(2)) : 0,
      active_recoveries: activeRecoveries || 0,
    };
  }

  async listQueueJobs(limit = 50): Promise<QueueJobRecord[]> {
    const { data } = await this.supabase
      .from("queue_jobs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(Math.max(1, limit));

    return ((data as DatabaseQueueJobRow[] | null) || []).map(mapQueueJob);
  }

  async listSystemLogs(limit = 50): Promise<SystemLogRecord[]> {
    const { data } = await this.supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, limit));

    return ((data as DatabaseSystemLogRow[] | null) || []).map(mapSystemLog);
  }

  async getFollowUpContacts(agentName?: string): Promise<FollowUpContact[]> {
    let query = this.supabase
      .from("recovery_leads")
      .select("*, payment:payments(*), agent:agents(*)")
      .order("updated_at", { ascending: false })
      .limit(2000);

    if (agentName) {
      const agentId = await this.resolveAgentIdByName(agentName);
      if (!agentId) return [];
      query = query.eq("assigned_agent_id", agentId);
    }

    const { data: leads } = await query;

    return ((leads as DatabaseLeadRow[] | null) || []).map((lead) => {
      const payment = unwrapRelation(lead.payment);
      const agent = unwrapRelation(lead.agent);

      return {
      lead_id: lead.lead_id,
      customer_name: lead.customer_name,
      email: lead.email,
      phone: lead.phone,
      product: lead.product ?? undefined,
      payment_value: Number(lead.payment_value),
      payment_status: payment?.status ?? "unknown",
      payment_method: payment?.payment_method ?? "unknown",
      lead_status: lead.status as RecoveryLeadStatus,
      order_id: payment?.order_id ?? "unknown",
      gateway_payment_id: payment?.gateway_payment_id ?? "unknown",
      assigned_agent: agent?.name ?? undefined,
      created_at: new Date(lead.created_at).toISOString(),
      updated_at: new Date(lead.updated_at).toISOString(),
      };
    });
  }

  async getInboxConversations(agentName?: string): Promise<InboxConversation[]> {
    let query = this.supabase
      .from("conversations")
      .select("*, agent:agents(*)")
      .order("last_message_at", { ascending: false })
      .limit(1000);

    if (agentName) {
      const agentId = await this.resolveAgentIdByName(agentName);
      if (!agentId) return [];
      query = query.eq("assigned_agent_id", agentId);
    }

    const { data: conversations } = await query;

    const conversationRows = (conversations as DatabaseConversationRow[] | null) || [];
    const conversationIds = conversationRows.map((conversation) => conversation.id);

    const { data: messages } = conversationIds.length
      ? await this.supabase
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
      : { data: [] as DatabaseMessageRow[] };

    const messagesByConversation = new Map<string, DatabaseMessageRow[]>();

    ((messages as DatabaseMessageRow[] | null) || []).forEach((message) => {
      const current = messagesByConversation.get(message.conversation_id) ?? [];
      current.push(message);
      messagesByConversation.set(message.conversation_id, current);
    });

    return conversationRows.map((conversation) => {
      const agent = unwrapRelation(conversation.agent);
      const relatedMessages = messagesByConversation.get(conversation.id) ?? [];
      const lastMessage = relatedMessages[0];
      const unreadCount = relatedMessages.filter((message) => {
        return (
          message.direction === "inbound" &&
          message.status !== "read" &&
          message.status !== "failed"
        );
      }).length;

      return {
        conversation_id: conversation.id,
        lead_id: conversation.lead_public_id ?? undefined,
        customer_name: conversation.customer_name,
        channel: conversation.channel,
        contact_value: conversation.contact_value,
        assigned_agent: agent?.name ?? undefined,
        status: conversation.status,
        last_message_preview: lastMessage?.content ?? "Sem mensagens ainda.",
        last_message_at: toIsoStringOrNow(
          lastMessage?.created_at ?? conversation.last_message_at,
        ),
        unread_count: unreadCount,
        message_count: relatedMessages.length,
      };
    });
  }

  async getConversationMessages(conversationId: string): Promise<MessageRecord[]> {
    const { data } = await this.supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return ((data as DatabaseMessageRow[] | null) || []).map(mapMessage);
  }

  async getSellerAdminControls(): Promise<SellerAdminControlRecord[]> {
    const { data, error } = await this.supabase
      .from("seller_admin_controls")
      .select("*")
      .order("seller_name", { ascending: true });

    if (error || !data) {
      return [];
    }

    return ((data as DatabaseSellerAdminControlRow[] | null) || []).map(
      mapSellerAdminControl,
    );
  }

  async listSellerUsers(): Promise<SellerUserRecord[]> {
    const { data, error } = await this.supabase
      .from("seller_users")
      .select("*")
      .order("display_name", { ascending: true });

    if (error || !data) {
      return [];
    }

    return ((data as DatabaseSellerUserRow[] | null) || []).map(mapSellerUser);
  }

  async findSellerUserByEmail(email: string): Promise<SellerUserRecord | undefined> {
    const { data, error } = await this.supabase
      .from("seller_users")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return mapSellerUser(data as DatabaseSellerUserRow);
  }

  async saveSellerUser(input: SellerUserInput): Promise<SellerUserRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.findSellerUserByEmail(normalizedEmail);
    const now = new Date().toISOString();
    const payload = {
      id: existing?.id ?? normalizedEmail,
      email: normalizedEmail,
      display_name: input.displayName?.trim() || existing?.displayName || normalizedEmail,
      agent_name: input.agentName.trim() || existing?.agentName || normalizedEmail,
      password_hash: input.passwordHash ?? existing?.passwordHash ?? "",
      active: input.active ?? existing?.active ?? true,
      created_at: existing?.createdAt ?? now,
      updated_at: now,
      last_login_at: existing?.lastLoginAt ?? null,
    };

    const { data, error } = await this.supabase
      .from("seller_users")
      .upsert(payload, { onConflict: "email" })
      .select("*")
      .single();

    if (error || !data) {
      return mapSellerUser(payload as DatabaseSellerUserRow);
    }

    return mapSellerUser(data as DatabaseSellerUserRow);
  }

  async touchSellerUserLogin(email: string): Promise<void> {
    await this.supabase
      .from("seller_users")
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email.trim().toLowerCase());
  }

  async listSellerInvites(): Promise<SellerInviteRecord[]> {
    const { data, error } = await this.supabase
      .from("seller_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return ((data as DatabaseSellerInviteRow[] | null) || []).map(mapSellerInvite);
  }

  async findSellerInviteByToken(token: string): Promise<SellerInviteRecord | undefined> {
    const { data, error } = await this.supabase
      .from("seller_invites")
      .select("*")
      .eq("token", token.trim())
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return mapSellerInvite(data as DatabaseSellerInviteRow);
  }

  async createSellerInvite(input: SellerInviteInput): Promise<SellerInviteRecord> {
    const now = new Date();
    const payload = {
      id: randomUUID(),
      token: randomUUID(),
      email: input.email.trim().toLowerCase(),
      suggested_display_name: input.suggestedDisplayName?.trim() || null,
      agent_name: input.agentName?.trim() || null,
      note: input.note?.trim() || null,
      created_by_email: input.createdByEmail.trim().toLowerCase(),
      status: "pending" as const,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: new Date(
        now.getTime() + Math.max(1, input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000,
      ).toISOString(),
      accepted_at: null,
      revoked_at: null,
    };

    const { data, error } = await this.supabase
      .from("seller_invites")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create seller invite: ${error?.message ?? "unknown error"}`);
    }

    return mapSellerInvite(data as DatabaseSellerInviteRow);
  }

  async markSellerInviteAccepted(token: string): Promise<SellerInviteRecord | undefined> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("seller_invites")
      .update({
        status: "accepted",
        accepted_at: now,
        updated_at: now,
      })
      .eq("token", token.trim())
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return mapSellerInvite(data as DatabaseSellerInviteRow);
  }

  /* ── Affiliates ── */

  async createAffiliateLink(input: AffiliateLinkInput): Promise<AffiliateLinkRecord> {
    const code = randomUUID().replace(/-/g, "").slice(0, 12);
    const now = new Date().toISOString();
    const payload = {
      seller_key: input.sellerKey,
      seller_email: input.sellerEmail,
      code,
      label: input.label ?? null,
      commission_pct: input.commissionPct ?? 5,
      clicks: 0,
      active: true,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("affiliate_links")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create affiliate link: ${error?.message ?? "no data"}`);
    }

    return mapAffiliateLink(data);
  }

  async listAffiliateLinks(sellerKey: string): Promise<AffiliateLinkRecord[]> {
    const { data, error } = await this.supabase
      .from("affiliate_links")
      .select("*")
      .eq("seller_key", sellerKey)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []).map(mapAffiliateLink);
  }

  async getAffiliateLinkByCode(code: string): Promise<AffiliateLinkRecord | undefined> {
    const { data, error } = await this.supabase
      .from("affiliate_links")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapAffiliateLink(data);
  }

  async deactivateAffiliateLink(linkId: string): Promise<void> {
    await this.supabase
      .from("affiliate_links")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", linkId);
  }

  async incrementAffiliateLinkClicks(code: string): Promise<void> {
    const link = await this.getAffiliateLinkByCode(code);
    if (!link) return;
    await this.supabase
      .from("affiliate_links")
      .update({ clicks: link.clicks + 1 })
      .eq("code", code);
  }

  async listAffiliateReferrals(sellerKey: string): Promise<AffiliateReferralRecord[]> {
    const { data, error } = await this.supabase
      .from("affiliate_referrals")
      .select("*")
      .eq("referrer_seller_key", sellerKey)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []).map(mapAffiliateReferral);
  }

  async getAffiliateStats(sellerKey: string): Promise<AffiliateStats> {
    const [links, referrals] = await Promise.all([
      this.listAffiliateLinks(sellerKey),
      this.listAffiliateReferrals(sellerKey),
    ]);

    return {
      totalLinks: links.length,
      totalClicks: links.reduce((sum, l) => sum + l.clicks, 0),
      totalSignups: referrals.length,
      activeReferrals: referrals.filter((r) => r.status === "active").length,
      pendingReferrals: referrals.filter((r) => r.status === "pending").length,
    };
  }

  async saveSellerAdminControl(
    input: SellerAdminControlInput,
  ): Promise<SellerAdminControlRecord> {
    const sellerKey = normalizeSellerKey(input.sellerKey);
    const existing = (await this.getSellerAdminControls()).find(
      (control) => control.sellerKey === sellerKey,
    );
    const now = new Date().toISOString();
    const payload = {
      id: existing?.id ?? sellerKey,
      seller_key: sellerKey,
      seller_name: input.sellerName?.trim() || existing?.sellerName || input.sellerKey,
      seller_email:
        input.sellerEmail?.trim().toLowerCase() || existing?.sellerEmail || null,
      active: input.active ?? existing?.active ?? true,
      recovery_target_percent: clampPercent(
        input.recoveryTargetPercent ?? existing?.recoveryTargetPercent ?? 18,
      ),
      reported_recovery_rate_percent:
        input.reportedRecoveryRatePercent !== undefined
          ? clampOptionalPercent(input.reportedRecoveryRatePercent)
          : existing?.reportedRecoveryRatePercent ?? null,
      max_assigned_leads: clampLeadLimit(
        input.maxAssignedLeads ?? existing?.maxAssignedLeads ?? 30,
      ),
      inbox_enabled: input.inboxEnabled ?? existing?.inboxEnabled ?? true,
      automations_enabled:
        input.automationsEnabled ?? existing?.automationsEnabled ?? true,
      autonomy_mode: input.autonomyMode ?? existing?.autonomyMode ?? "autonomous",
      messaging_approach: input.messagingApproach ?? existing?.messagingApproach ?? "friendly",
      gateway_slug: input.gatewaySlug?.trim() || existing?.gatewaySlug || null,
      gateway_api_key: input.gatewayApiKey?.trim() || existing?.gatewayApiKey || null,
      whitelabel_id: input.whitelabelId?.trim() || existing?.whitelabelId || null,
      checkout_url: input.checkoutUrl?.trim() || existing?.checkoutUrl || null,
      checkout_api_key: input.checkoutApiKey?.trim() || existing?.checkoutApiKey || null,
      notes: input.notes?.trim() || existing?.notes || null,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("seller_admin_controls")
      .upsert(payload, { onConflict: "seller_key" })
      .select("*")
      .single();

    if (error || !data) {
      return mapSellerAdminControl(payload as DatabaseSellerAdminControlRow);
    }

    return mapSellerAdminControl(data as DatabaseSellerAdminControlRow);
  }

  async getConnectionSettings(): Promise<ConnectionSettingsRecord> {
    const fallback = createDefaultConnectionSettings();
    const { data, error } = await this.supabase
      .from("connection_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    return mapConnectionSettings(data as DatabaseConnectionSettingsRow, fallback);
  }

  async saveConnectionSettings(
    input: ConnectionSettingsInput,
  ): Promise<ConnectionSettingsRecord> {
    const current = await this.getConnectionSettings();

    const payload = {
      id: "default",
      app_base_url: input.appBaseUrl ?? current.appBaseUrl,
      webhook_secret: input.webhookSecret ?? current.webhookSecret,
      webhook_tolerance_seconds:
        input.webhookToleranceSeconds ?? current.webhookToleranceSeconds,
      whatsapp_provider: input.whatsappProvider ?? current.whatsappProvider,
      whatsapp_api_base_url:
        input.whatsappApiBaseUrl ?? current.whatsappApiBaseUrl,
      whatsapp_access_token:
        input.whatsappAccessToken ?? current.whatsappAccessToken,
      whatsapp_phone_number_id:
        input.whatsappPhoneNumberId ?? current.whatsappPhoneNumberId,
      whatsapp_business_account_id:
        input.whatsappBusinessAccountId ?? current.whatsappBusinessAccountId,
      whatsapp_webhook_verify_token:
        input.whatsappWebhookVerifyToken ?? current.whatsappWebhookVerifyToken,
      whatsapp_web_session_id:
        input.whatsappWebSessionId ?? current.whatsappWebSessionId,
      whatsapp_web_session_status:
        input.whatsappWebSessionStatus ?? current.whatsappWebSessionStatus,
      whatsapp_web_session_qr_code:
        input.whatsappWebSessionQrCode ?? current.whatsappWebSessionQrCode,
      whatsapp_web_session_phone:
        input.whatsappWebSessionPhone ?? current.whatsappWebSessionPhone,
      whatsapp_web_session_error:
        input.whatsappWebSessionError ?? current.whatsappWebSessionError,
      whatsapp_web_session_updated_at:
        input.whatsappWebSessionUpdatedAt ?? current.whatsappWebSessionUpdatedAt,
      email_provider: input.emailProvider ?? current.emailProvider,
      email_api_key: input.emailApiKey ?? current.emailApiKey,
      email_from_address: input.emailFromAddress ?? current.emailFromAddress,
      crm_api_url: input.crmApiUrl ?? current.crmApiUrl,
      crm_api_key: input.crmApiKey ?? current.crmApiKey,
      openai_api_key: input.openAiApiKey ?? current.openAiApiKey,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("connection_settings")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error || !data) {
      return {
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
      };
    }

    return mapConnectionSettings(
      data as DatabaseConnectionSettingsRow,
      createDefaultConnectionSettings(),
    );
  }

  getWebhookUrl(): string {
    return `${appEnv.appBaseUrl}${buildGatewayWebhookPath()}`;
  }

  /* ── CallCenter ── */

  async listCalls(options?: {
    leadId?: string;
    customerId?: string;
    campaignId?: string;
    status?: string;
    sellerKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CallRecord[]> {
    let query = this.supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false });

    if (options?.leadId) query = query.eq("lead_id", options.leadId);
    if (options?.customerId) query = query.eq("customer_id", options.customerId);
    if (options?.campaignId) query = query.eq("campaign_id", options.campaignId);
    if (options?.status) query = query.eq("status", options.status);
    if (options?.sellerKey) query = query.eq("seller_key", options.sellerKey);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapCall);
  }

  async getCall(callId: string): Promise<CallRecord | undefined> {
    const { data, error } = await this.supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapCall(data);
  }

  async getCallByProviderCallId(providerCallId: string): Promise<CallRecord | undefined> {
    const { data, error } = await this.supabase
      .from("calls")
      .select("*")
      .eq("provider_call_id", providerCallId)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapCall(data);
  }

  async createCall(input: CreateCallInput): Promise<CallRecord> {
    const row = {
      campaign_id: input.campaignId ?? null,
      lead_id: input.leadId ?? null,
      customer_id: input.customerId ?? null,
      agent_id: input.agentId ?? null,
      direction: input.direction ?? "outbound",
      from_number: input.fromNumber ?? null,
      to_number: input.toNumber,
      status: "queued",
      provider: input.provider ?? "vapi",
      provider_call_id: input.providerCallId ?? null,
      copy: input.copy ?? null,
      product: input.product ?? null,
      discount_percent: input.discountPercent ?? null,
      coupon_code: input.couponCode ?? null,
      voice_tone: input.voiceTone ?? null,
      voice_gender: input.voiceGender ?? null,
      seller_key: input.sellerKey ?? null,
      metadata: input.metadata ?? {},
    };

    const { data, error } = await this.supabase
      .from("calls")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create call: ${error?.message ?? "unknown"}`);
    }

    return mapCall(data);
  }

  async updateCall(callId: string, input: UpdateCallInput): Promise<CallRecord> {
    const row: Record<string, unknown> = {};

    if (input.status !== undefined) row.status = input.status;
    if (input.startedAt !== undefined) row.started_at = input.startedAt;
    if (input.answeredAt !== undefined) row.answered_at = input.answeredAt;
    if (input.endedAt !== undefined) row.ended_at = input.endedAt;
    if (input.durationSeconds !== undefined) row.duration_seconds = input.durationSeconds;
    if (input.ringDurationSeconds !== undefined) row.ring_duration_seconds = input.ringDurationSeconds;
    if (input.recordingUrl !== undefined) row.recording_url = input.recordingUrl;
    if (input.recordingDurationSeconds !== undefined) row.recording_duration_seconds = input.recordingDurationSeconds;
    if (input.transcript !== undefined) row.transcript = input.transcript;
    if (input.transcriptSummary !== undefined) row.transcript_summary = input.transcriptSummary;
    if (input.outcome !== undefined) row.outcome = input.outcome;
    if (input.outcomeNotes !== undefined) row.outcome_notes = input.outcomeNotes;
    if (input.callbackScheduledAt !== undefined) row.callback_scheduled_at = input.callbackScheduledAt;
    if (input.providerCallId !== undefined) row.provider_call_id = input.providerCallId;
    if (input.providerCost !== undefined) row.provider_cost = input.providerCost;
    if (input.sentiment !== undefined) row.sentiment = input.sentiment;
    if (input.chosenPaymentMethod !== undefined) row.chosen_payment_method = input.chosenPaymentMethod;
    if (input.checkoutSessionId !== undefined) row.checkout_session_id = input.checkoutSessionId;
    if (input.checkoutUrl !== undefined) row.checkout_url = input.checkoutUrl;
    if (input.metadata !== undefined) row.metadata = input.metadata;

    const { data, error } = await this.supabase
      .from("calls")
      .update(row)
      .eq("id", callId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update call: ${error?.message ?? "unknown"}`);
    }

    return mapCall(data);
  }

  async createCallEvent(callId: string, eventType: string, eventData?: Record<string, unknown>): Promise<void> {
    await this.supabase.from("call_events").insert({
      call_id: callId,
      event_type: eventType,
      data: eventData ?? {},
    });
  }

  async getCallEvents(callId: string): Promise<CallEventRecord[]> {
    const { data, error } = await this.supabase
      .from("call_events")
      .select("*")
      .eq("call_id", callId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data.map(mapCallEvent);
  }

  async getCallAnalytics(): Promise<CallAnalytics> {
    const { data, error } = await this.supabase
      .from("calls")
      .select("status, outcome, duration_seconds, answered_at");

    if (error || !data) {
      return {
        totalCalls: 0,
        completedCalls: 0,
        answeredCalls: 0,
        totalDurationSeconds: 0,
        averageDurationSeconds: 0,
        answerRate: 0,
        recoveredFromCalls: 0,
        callbacksScheduled: 0,
        byOutcome: {},
        byStatus: {},
      };
    }

    const totalCalls = data.length;
    const completedCalls = data.filter((c: { status: string }) => c.status === "completed").length;
    const answeredCalls = data.filter((c: { answered_at: string | null }) => c.answered_at != null).length;
    const totalDuration = data.reduce((sum: number, c: { duration_seconds: number | null }) => sum + (Number(c.duration_seconds) || 0), 0);

    const byOutcome: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const call of data as Array<{ status: string; outcome?: string }>) {
      byStatus[call.status] = (byStatus[call.status] || 0) + 1;
      if (call.outcome) {
        byOutcome[call.outcome] = (byOutcome[call.outcome] || 0) + 1;
      }
    }

    return {
      totalCalls,
      completedCalls,
      answeredCalls,
      totalDurationSeconds: totalDuration,
      averageDurationSeconds: completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0,
      answerRate: totalCalls > 0 ? answeredCalls / totalCalls : 0,
      recoveredFromCalls: byOutcome["recovered"] ?? 0,
      callbacksScheduled: byOutcome["callback_scheduled"] ?? 0,
      byOutcome,
      byStatus,
    };
  }

  async listCallCampaigns(): Promise<CallCampaignRecord[]> {
    const { data, error } = await this.supabase
      .from("call_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapCallCampaign);
  }

  async createCallCampaign(input: {
    name: string;
    description?: string;
    filterCriteria?: Record<string, unknown>;
    createdBy?: string;
  }): Promise<CallCampaignRecord> {
    const { data, error } = await this.supabase
      .from("call_campaigns")
      .insert({
        name: input.name,
        description: input.description ?? "",
        filter_criteria: input.filterCriteria ?? {},
        created_by: input.createdBy ?? null,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create campaign: ${error?.message ?? "unknown"}`);
    }

    return mapCallCampaign(data);
  }

  async updateCallCampaign(
    campaignId: string,
    input: Partial<{ name: string; description: string; status: string; totalContacts: number; completedContacts: number; successfulContacts: number; startedAt: string; completedAt: string }>,
  ): Promise<CallCampaignRecord> {
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description;
    if (input.status !== undefined) row.status = input.status;
    if (input.totalContacts !== undefined) row.total_contacts = input.totalContacts;
    if (input.completedContacts !== undefined) row.completed_contacts = input.completedContacts;
    if (input.successfulContacts !== undefined) row.successful_contacts = input.successfulContacts;
    if (input.startedAt !== undefined) row.started_at = input.startedAt;
    if (input.completedAt !== undefined) row.completed_at = input.completedAt;

    const { data, error } = await this.supabase
      .from("call_campaigns")
      .update(row)
      .eq("id", campaignId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update campaign: ${error?.message ?? "unknown"}`);
    }

    return mapCallCampaign(data);
  }

  /* ── CallCenter Settings ── */

  async getCallcenterSettings(sellerKey: string): Promise<CallcenterSettingsRecord | undefined> {
    const { data, error } = await this.supabase
      .from("callcenter_settings")
      .select("*")
      .eq("seller_key", sellerKey)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapCallcenterSettings(data);
  }

  async listCallcenterSettings(): Promise<CallcenterSettingsRecord[]> {
    const { data, error } = await this.supabase
      .from("callcenter_settings")
      .select("*")
      .order("seller_key", { ascending: true });

    if (error || !data) return [];
    return data.map(mapCallcenterSettings);
  }

  async upsertCallcenterSettings(input: CallcenterSettingsInput): Promise<CallcenterSettingsRecord> {
    const row: Record<string, unknown> = {
      seller_key: input.sellerKey,
    };
    if (input.voiceTone !== undefined) row.voice_tone = input.voiceTone;
    if (input.voiceGender !== undefined) row.voice_gender = input.voiceGender;
    if (input.discountPercent !== undefined) row.discount_percent = input.discountPercent;
    if (input.couponCode !== undefined) row.coupon_code = input.couponCode;
    if (input.defaultCopy !== undefined) row.default_copy = input.defaultCopy;
    if (input.defaultProduct !== undefined) row.default_product = input.defaultProduct;
    if (input.provider !== undefined) row.provider = input.provider;
    if (input.maxCallsPerDay !== undefined) row.max_calls_per_day = input.maxCallsPerDay;
    if (input.autoCallEnabled !== undefined) row.auto_call_enabled = input.autoCallEnabled;

    const { data, error } = await this.supabase
      .from("callcenter_settings")
      .upsert(row, { onConflict: "seller_key" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert callcenter settings: ${error?.message ?? "unknown"}`);
    }

    return mapCallcenterSettings(data);
  }

  async listWhitelabelProfiles(): Promise<WhitelabelProfileRecord[]> {
    const { data, error } = await this.supabase
      .from("whitelabel_profiles")
      .select("*")
      .order("name", { ascending: true });
    if (error || !data) return [];

    // Count sellers per profile
    const controls = await this.getSellerAdminControls();
    const countMap = new Map<string, number>();
    for (const c of controls) {
      if (c.whitelabelId) {
        countMap.set(c.whitelabelId, (countMap.get(c.whitelabelId) ?? 0) + 1);
      }
    }

    return (data as DatabaseWhitelabelProfileRow[]).map(row =>
      mapWhitelabelProfile(row, countMap.get(row.id) ?? 0)
    );
  }

  async getWhitelabelProfile(id: string): Promise<WhitelabelProfileRecord | undefined> {
    const { data, error } = await this.supabase
      .from("whitelabel_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return undefined;

    const controls = await this.getSellerAdminControls();
    const count = controls.filter(c => c.whitelabelId === id).length;
    return mapWhitelabelProfile(data as DatabaseWhitelabelProfileRow, count);
  }

  async saveWhitelabelProfile(input: WhitelabelProfileInput, id?: string): Promise<WhitelabelProfileRecord> {
    const now = new Date().toISOString();
    const slug = input.slug?.trim() || input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    let existing: WhitelabelProfileRecord | undefined;
    if (id) {
      existing = await this.getWhitelabelProfile(id);
    }

    const payload = {
      id: existing?.id ?? id ?? randomUUID(),
      name: input.name.trim(),
      slug,
      gateway_provider: input.gatewayProvider,
      gateway_base_url: input.gatewayBaseUrl?.trim() ?? existing?.gatewayBaseUrl ?? "",
      gateway_docs_url: input.gatewayDocsUrl?.trim() ?? existing?.gatewayDocsUrl ?? "",
      gateway_webhook_path: input.gatewayWebhookPath?.trim() ?? existing?.gatewayWebhookPath ?? "",
      checkout_url: input.checkoutUrl?.trim() ?? existing?.checkoutUrl ?? "",
      checkout_api_key: input.checkoutApiKey?.trim() ?? existing?.checkoutApiKey ?? "",
      brand_accent: input.brandAccent?.trim() ?? existing?.brandAccent ?? "",
      brand_logo: input.brandLogo?.trim() ?? existing?.brandLogo ?? "",
      active: input.active ?? existing?.active ?? true,
      notes: input.notes?.trim() ?? existing?.notes ?? "",
      created_at: existing?.createdAt ?? now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("whitelabel_profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error || !data) {
      return mapWhitelabelProfile(payload as DatabaseWhitelabelProfileRow, 0);
    }
    return mapWhitelabelProfile(data as DatabaseWhitelabelProfileRow, 0);
  }

  async deleteWhitelabelProfile(id: string): Promise<void> {
    await this.supabase.from("whitelabel_profiles").delete().eq("id", id);
  }

  /* ── Quiz leads ── */

  async listQuizLeads(): Promise<QuizLeadRecord[]> {
    const { data, error } = await this.supabase
      .from("quiz_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapQuizLead);
  }

  async createQuizLead(input: { email: string; answers: string[] }): Promise<QuizLeadRecord> {
    const email = input.email.trim().toLowerCase();

    // Upsert: if email already exists, just return the existing record
    const { data: existing } = await this.supabase
      .from("quiz_leads")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existing) return mapQuizLead(existing);

    const { data, error } = await this.supabase
      .from("quiz_leads")
      .insert({ email, answers: input.answers })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create quiz lead: ${error?.message ?? "unknown"}`);
    }

    return mapQuizLead(data);
  }

  async updateQuizLead(
    id: string,
    input: { status?: string; whatsappSentAt?: string; notes?: string },
  ): Promise<QuizLeadRecord | undefined> {
    const updates: Record<string, unknown> = {};
    if (input.status) updates.status = input.status;
    if (input.whatsappSentAt) updates.whatsapp_sent_at = input.whatsappSentAt;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data, error } = await this.supabase
      .from("quiz_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return undefined;
    return mapQuizLead(data);
  }

  /* ── Demo Call Leads ── */

  async findDemoCallLeadByPhone(phone: string): Promise<DemoCallLeadRecord | undefined> {
    const { data, error } = await this.supabase
      .from("demo_call_leads")
      .select("*")
      .eq("phone", phone.trim())
      .maybeSingle();
    if (error || !data) return undefined;
    return mapDemoCallLead(data as DatabaseDemoCallLeadRow);
  }

  async createDemoCallLead(input: { name: string; phone: string }): Promise<DemoCallLeadRecord> {
    const now = new Date().toISOString();
    const payload = {
      id: randomUUID(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      status: "pending",
      created_at: now,
    };
    const { data, error } = await this.supabase
      .from("demo_call_leads")
      .insert(payload)
      .select("*")
      .single();
    if (error || !data) return mapDemoCallLead(payload as DatabaseDemoCallLeadRow);
    return mapDemoCallLead(data as DatabaseDemoCallLeadRow);
  }

  async updateDemoCallLead(id: string, input: { status?: string; calledAt?: string; vapiCallId?: string }): Promise<DemoCallLeadRecord | undefined> {
    const updates: Record<string, unknown> = {};
    if (input.status) updates.status = input.status;
    if (input.calledAt) updates.called_at = input.calledAt;
    if (input.vapiCallId) updates.vapi_call_id = input.vapiCallId;
    const { data, error } = await this.supabase
      .from("demo_call_leads")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return undefined;
    return mapDemoCallLead(data as DatabaseDemoCallLeadRow);
  }

  async deleteDemoCallLeadByPhone(phone: string): Promise<void> {
    await this.supabase
      .from("demo_call_leads")
      .delete()
      .eq("phone", phone.trim());
  }

  async listDemoCallLeads(): Promise<DemoCallLeadRecord[]> {
    const { data, error } = await this.supabase
      .from("demo_call_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return (data as DatabaseDemoCallLeadRow[]).map(mapDemoCallLead);
  }

  /* ── Opt-out / Blacklist ── */

  async createOptOut(input: OptOutInput): Promise<OptOutRecord> {
    const row: Record<string, unknown> = {
      channel: input.channel,
      contact_value: input.contactValue,
      reason: input.reason ?? "unspecified",
      source: input.source ?? "api",
      opted_out_at: new Date().toISOString(),
    };
    if (input.sellerKey !== undefined) row.seller_key = input.sellerKey;
    if (input.metadata !== undefined) row.metadata = input.metadata;

    const { data, error } = await this.supabase
      .from("contact_opt_outs")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create opt-out: ${error?.message ?? "unknown"}`);
    }
    return mapOptOut(data);
  }

  async removeOptOut(channel: string, contactValue: string): Promise<void> {
    await this.supabase
      .from("contact_opt_outs")
      .delete()
      .eq("channel", channel)
      .eq("contact_value", contactValue);
  }

  async isOptedOut(channel: string, contactValue: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("contact_opt_outs")
      .select("id")
      .eq("contact_value", contactValue)
      .in("channel", [channel, "all"])
      .limit(1);

    if (error || !data) return false;
    return data.length > 0;
  }

  async listOptOuts(options?: { contactValue?: string; channel?: string; limit?: number }): Promise<OptOutRecord[]> {
    let query = this.supabase
      .from("contact_opt_outs")
      .select("*")
      .order("created_at", { ascending: false });

    if (options?.contactValue) query = query.eq("contact_value", options.contactValue);
    if (options?.channel) query = query.eq("channel", options.channel);
    query = query.limit(options?.limit ?? 100);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapOptOut);
  }

  /* ── Frequency Capping ── */

  async logContactFrequency(input: FrequencyLogInput): Promise<FrequencyLogRecord> {
    const row: Record<string, unknown> = {
      contact_value: input.contactValue,
      channel: input.channel,
      direction: input.direction ?? "outbound",
      sent_at: new Date().toISOString(),
    };
    if (input.messageId !== undefined) row.message_id = input.messageId;
    if (input.callId !== undefined) row.call_id = input.callId;
    if (input.sellerKey !== undefined) row.seller_key = input.sellerKey;

    const { data, error } = await this.supabase
      .from("contact_frequency_log")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to log contact frequency: ${error?.message ?? "unknown"}`);
    }
    return mapFrequencyLog(data);
  }

  async checkFrequencyLimit(contactValue: string, sellerKey?: string): Promise<FrequencyCheck> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get seller limits
    let maxPerDay = 2;
    let maxPerWeek = 5;
    if (sellerKey) {
      const { data: config } = await this.supabase
        .from("seller_admin_controls")
        .select("max_contacts_per_lead_per_day, max_contacts_per_lead_per_week")
        .eq("seller_key", sellerKey)
        .maybeSingle();
      if (config) {
        maxPerDay = Number(config.max_contacts_per_lead_per_day) || 2;
        maxPerWeek = Number(config.max_contacts_per_lead_per_week) || 5;
      }
    }

    // Count contacts today
    const { count: contactsToday } = await this.supabase
      .from("contact_frequency_log")
      .select("id", { count: "exact", head: true })
      .eq("contact_value", contactValue)
      .gte("sent_at", todayStart);

    // Count contacts this week
    const { count: contactsThisWeek } = await this.supabase
      .from("contact_frequency_log")
      .select("id", { count: "exact", head: true })
      .eq("contact_value", contactValue)
      .gte("sent_at", weekStart);

    const todayCount = contactsToday ?? 0;
    const weekCount = contactsThisWeek ?? 0;

    let allowed = true;
    let reason: string | undefined;
    if (todayCount >= maxPerDay) {
      allowed = false;
      reason = `Daily limit reached (${todayCount}/${maxPerDay})`;
    } else if (weekCount >= maxPerWeek) {
      allowed = false;
      reason = `Weekly limit reached (${weekCount}/${maxPerWeek})`;
    }

    return {
      allowed,
      reason,
      contactsToday: todayCount,
      contactsThisWeek: weekCount,
      maxPerDay,
      maxPerWeek,
    };
  }

  async getContactFrequencyLog(contactValue: string, options?: { since?: string; channel?: string; limit?: number }): Promise<FrequencyLogRecord[]> {
    let query = this.supabase
      .from("contact_frequency_log")
      .select("*")
      .eq("contact_value", contactValue)
      .order("sent_at", { ascending: false });

    if (options?.since) query = query.gte("sent_at", options.since);
    if (options?.channel) query = query.eq("channel", options.channel);
    query = query.limit(options?.limit ?? 100);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapFrequencyLog);
  }

  /* ── Message Templates ── */

  async listMessageTemplates(options?: { category?: string; vertical?: string; channel?: string; sellerKey?: string; active?: boolean }): Promise<MessageTemplateRecord[]> {
    let query = this.supabase
      .from("message_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (options?.category) query = query.eq("category", options.category);
    if (options?.vertical) query = query.eq("vertical", options.vertical);
    if (options?.channel) query = query.eq("channel", options.channel);
    if (options?.sellerKey) query = query.eq("seller_key", options.sellerKey);
    if (options?.active !== undefined) query = query.eq("active", options.active);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapMessageTemplate);
  }

  async getMessageTemplate(idOrSlug: string): Promise<MessageTemplateRecord | undefined> {
    const { data, error } = await this.supabase
      .from("message_templates")
      .select("*")
      .or(`id.eq.${UUID_REGEX.test(idOrSlug) ? sanitizeUuidFilterValue(idOrSlug) : "00000000-0000-0000-0000-000000000000"},slug.eq.${sanitizeFilterValue(idOrSlug)}`)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapMessageTemplate(data);
  }

  async createMessageTemplate(input: MessageTemplateInput): Promise<MessageTemplateRecord> {
    const row: Record<string, unknown> = {
      name: input.name,
      slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      body_whatsapp: input.bodyWhatsapp,
    };
    if (input.category !== undefined) row.category = input.category;
    if (input.vertical !== undefined) row.vertical = input.vertical;
    if (input.channel !== undefined) row.channel = input.channel;
    if (input.subject !== undefined) row.subject = input.subject;
    if (input.bodySms !== undefined) row.body_sms = input.bodySms;
    if (input.bodyEmailHtml !== undefined) row.body_email_html = input.bodyEmailHtml;
    if (input.bodyEmailText !== undefined) row.body_email_text = input.bodyEmailText;
    if (input.variables !== undefined) row.variables = input.variables;
    if (input.active !== undefined) row.active = input.active;
    if (input.sellerKey !== undefined) row.seller_key = input.sellerKey;

    const { data, error } = await this.supabase
      .from("message_templates")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create message template: ${error?.message ?? "unknown"}`);
    }
    return mapMessageTemplate(data);
  }

  async updateMessageTemplate(id: string, input: Partial<MessageTemplateInput>): Promise<MessageTemplateRecord> {
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.slug !== undefined) row.slug = input.slug;
    if (input.category !== undefined) row.category = input.category;
    if (input.vertical !== undefined) row.vertical = input.vertical;
    if (input.channel !== undefined) row.channel = input.channel;
    if (input.subject !== undefined) row.subject = input.subject;
    if (input.bodyWhatsapp !== undefined) row.body_whatsapp = input.bodyWhatsapp;
    if (input.bodySms !== undefined) row.body_sms = input.bodySms;
    if (input.bodyEmailHtml !== undefined) row.body_email_html = input.bodyEmailHtml;
    if (input.bodyEmailText !== undefined) row.body_email_text = input.bodyEmailText;
    if (input.variables !== undefined) row.variables = input.variables;
    if (input.active !== undefined) row.active = input.active;
    if (input.sellerKey !== undefined) row.seller_key = input.sellerKey;

    const { data, error } = await this.supabase
      .from("message_templates")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update message template: ${error?.message ?? "unknown"}`);
    }
    return mapMessageTemplate(data);
  }

  async incrementTemplateUsage(id: string, converted?: boolean): Promise<void> {
    const { data: current, error: readError } = await this.supabase
      .from("message_templates")
      .select("usage_count, conversion_count")
      .eq("id", id)
      .single();

    if (readError || !current) {
      throw new Error(`Failed to read template for increment: ${readError?.message ?? "unknown"}`);
    }

    const updates: Record<string, unknown> = {
      usage_count: (Number(current.usage_count) || 0) + 1,
    };
    if (converted) {
      updates.conversion_count = (Number(current.conversion_count) || 0) + 1;
    }

    const { error } = await this.supabase
      .from("message_templates")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to increment template usage: ${error.message}`);
    }
  }

  /* ── A/B Testing ── */

  async createABTest(input: ABTestInput): Promise<ABTestRecord> {
    const row: Record<string, unknown> = {
      name: input.name,
      template_a_id: input.templateAId,
      template_b_id: input.templateBId,
      status: "draft",
    };
    if (input.channel !== undefined) row.channel = input.channel;
    if (input.sellerKey !== undefined) row.seller_key = input.sellerKey;

    const { data, error } = await this.supabase
      .from("ab_tests")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create A/B test: ${error?.message ?? "unknown"}`);
    }
    return mapABTest(data);
  }

  async getABTest(id: string): Promise<ABTestRecord | undefined> {
    const { data, error } = await this.supabase
      .from("ab_tests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapABTest(data);
  }

  async listABTests(options?: { status?: string; sellerKey?: string }): Promise<ABTestRecord[]> {
    let query = this.supabase
      .from("ab_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (options?.status) query = query.eq("status", options.status);
    if (options?.sellerKey) query = query.eq("seller_key", options.sellerKey);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapABTest);
  }

  async updateABTest(id: string, input: Partial<ABTestRecord>): Promise<ABTestRecord> {
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.status !== undefined) row.status = input.status;
    if (input.templateAId !== undefined) row.template_a_id = input.templateAId;
    if (input.templateBId !== undefined) row.template_b_id = input.templateBId;
    if (input.channel !== undefined) row.channel = input.channel;
    if (input.sellerKey !== undefined) row.seller_key = input.sellerKey;
    if (input.totalSentA !== undefined) row.total_sent_a = input.totalSentA;
    if (input.totalSentB !== undefined) row.total_sent_b = input.totalSentB;
    if (input.totalDeliveredA !== undefined) row.total_delivered_a = input.totalDeliveredA;
    if (input.totalDeliveredB !== undefined) row.total_delivered_b = input.totalDeliveredB;
    if (input.totalClickedA !== undefined) row.total_clicked_a = input.totalClickedA;
    if (input.totalClickedB !== undefined) row.total_clicked_b = input.totalClickedB;
    if (input.totalConvertedA !== undefined) row.total_converted_a = input.totalConvertedA;
    if (input.totalConvertedB !== undefined) row.total_converted_b = input.totalConvertedB;
    if (input.winner !== undefined) row.winner = input.winner;
    if (input.confidencePct !== undefined) row.confidence_pct = input.confidencePct;
    if (input.startedAt !== undefined) row.started_at = input.startedAt;
    if (input.completedAt !== undefined) row.completed_at = input.completedAt;

    const { data, error } = await this.supabase
      .from("ab_tests")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update A/B test: ${error?.message ?? "unknown"}`);
    }
    return mapABTest(data);
  }

  async createABTestAssignment(input: { abTestId: string; contactValue: string; variant: "a" | "b"; messageId?: string }): Promise<ABTestAssignmentRecord> {
    const row: Record<string, unknown> = {
      ab_test_id: input.abTestId,
      contact_value: input.contactValue,
      variant: input.variant,
    };
    if (input.messageId !== undefined) row.message_id = input.messageId;

    const { data, error } = await this.supabase
      .from("ab_test_assignments")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create A/B test assignment: ${error?.message ?? "unknown"}`);
    }
    return mapABTestAssignment(data);
  }

  async getABTestAssignment(abTestId: string, contactValue: string): Promise<ABTestAssignmentRecord | undefined> {
    const { data, error } = await this.supabase
      .from("ab_test_assignments")
      .select("*")
      .eq("ab_test_id", abTestId)
      .eq("contact_value", contactValue)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapABTestAssignment(data);
  }

  async updateABTestAssignment(id: string, input: Partial<{ delivered: boolean; clicked: boolean; converted: boolean }>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (input.delivered !== undefined) row.delivered = input.delivered;
    if (input.clicked !== undefined) row.clicked = input.clicked;
    if (input.converted !== undefined) row.converted = input.converted;

    const { error } = await this.supabase
      .from("ab_test_assignments")
      .update(row)
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to update A/B test assignment: ${error.message}`);
    }
  }

  /* ── Recovery Funnel ── */

  async upsertFunnelSnapshot(input: Omit<RecoveryFunnelSnapshot, "id" | "createdAt">): Promise<RecoveryFunnelSnapshot> {
    const row: Record<string, unknown> = {
      snapshot_date: input.snapshotDate,
      channel: input.channel,
      total_sent: input.totalSent,
      total_delivered: input.totalDelivered,
      total_read: input.totalRead,
      total_clicked: input.totalClicked,
      total_converted: input.totalConverted,
      total_opted_out: input.totalOptedOut,
      total_revenue_recovered: input.totalRevenueRecovered,
    };
    if (input.sellerKey !== undefined) row.seller_key = input.sellerKey;

    const { data, error } = await this.supabase
      .from("recovery_funnel_snapshots")
      .upsert(row, { onConflict: "snapshot_date,seller_key,channel" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert funnel snapshot: ${error?.message ?? "unknown"}`);
    }
    return mapFunnelSnapshot(data);
  }

  async getFunnelSnapshots(options: { startDate: string; endDate: string; sellerKey?: string; channel?: string }): Promise<RecoveryFunnelSnapshot[]> {
    let query = this.supabase
      .from("recovery_funnel_snapshots")
      .select("*")
      .gte("snapshot_date", options.startDate)
      .lte("snapshot_date", options.endDate)
      .order("snapshot_date", { ascending: true });

    if (options.sellerKey) query = query.eq("seller_key", options.sellerKey);
    if (options.channel) query = query.eq("channel", options.channel);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapFunnelSnapshot);
  }
}

// Mappers
function mapCustomer(data: DatabaseCustomerRow): CustomerRecord {
  return {
    id: data.id,
    gatewayCustomerId: data.gateway_customer_id ?? "",
    name: data.name,
    email: data.email,
    phone: data.phone,
    document: data.document ?? undefined,
    createdAt: new Date(data.created_at).toISOString(),
    updatedAt: new Date(data.updated_at).toISOString(),
  };
}

function mapPayment(data: DatabasePaymentRow): PaymentRecord {
  return {
    id: data.id,
    gatewayPaymentId: data.gateway_payment_id,
    orderId: data.order_id,
    customerId: data.customer_id,
    status: data.status,
    amount: Number(data.amount),
    currency: data.currency,
    paymentMethod: data.payment_method,
    failureCode: data.failure_code ?? undefined,
    createdAt: new Date(data.created_at).toISOString(),
    updatedAt: new Date(data.updated_at).toISOString(),
    firstFailureAt: data.first_failure_at ? new Date(data.first_failure_at).toISOString() : undefined,
    recoveredAt: data.recovered_at ? new Date(data.recovered_at).toISOString() : undefined,
  };
}

function mapPaymentAttempt(data: DatabasePaymentAttemptRow): PaymentAttemptRecord {
  return {
    id: data.id,
    paymentId: data.payment_id,
    attemptNumber: data.attempt_number,
    status: data.status,
    failureReason: data.failure_reason ?? undefined,
    paymentLink: data.payment_link,
    createdAt: new Date(data.created_at).toISOString(),
  };
}

function mapQueueJob(data: DatabaseQueueJobRow): QueueJobRecord {
  return {
    id: data.id,
    queueName: data.queue_name,
    jobType: data.job_type,
    payload: data.payload,
    runAt: toIsoStringOrNow(data.run_at),
    attempts: data.attempts,
    status: data.status,
    createdAt: toIsoStringOrNow(data.created_at),
    error: data.error ?? undefined,
  };
}

function mapCalendarNote(data: DatabaseCalendarNoteRow): CalendarNoteRecord {
  return {
    id: data.id,
    date: data.date,
    lane: data.lane,
    title: data.title,
    content: data.content ?? undefined,
    createdByEmail: data.created_by_email,
    createdByRole: data.created_by_role,
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

function mapSellerAdminControl(
  data: DatabaseSellerAdminControlRow,
): SellerAdminControlRecord {
  return {
    id: data.id,
    sellerKey: data.seller_key,
    sellerName: data.seller_name,
    sellerEmail: data.seller_email ?? undefined,
    active: data.active,
    recoveryTargetPercent: Number(data.recovery_target_percent),
    reportedRecoveryRatePercent:
      data.reported_recovery_rate_percent === null ||
      data.reported_recovery_rate_percent === undefined
        ? undefined
        : Number(data.reported_recovery_rate_percent),
    maxAssignedLeads: data.max_assigned_leads,
    inboxEnabled: data.inbox_enabled,
    automationsEnabled: data.automations_enabled,
    autonomyMode: data.autonomy_mode,
    messagingApproach: data.messaging_approach ?? "friendly",
    gatewaySlug: data.gateway_slug ?? undefined,
    gatewayApiKey: data.gateway_api_key ?? undefined,
    whitelabelId: data.whitelabel_id ?? undefined,
    checkoutUrl: data.checkout_url ?? undefined,
    checkoutApiKey: data.checkout_api_key ?? undefined,
    notes: data.notes ?? undefined,
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

function mapWhitelabelProfile(data: DatabaseWhitelabelProfileRow, sellersCount: number = 0): WhitelabelProfileRecord {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    gatewayProvider: data.gateway_provider as GatewayProvider,
    gatewayBaseUrl: data.gateway_base_url ?? "",
    gatewayDocsUrl: data.gateway_docs_url ?? "",
    gatewayWebhookPath: data.gateway_webhook_path ?? "",
    checkoutUrl: data.checkout_url ?? "",
    checkoutApiKey: data.checkout_api_key ?? "",
    brandAccent: data.brand_accent ?? "",
    brandLogo: data.brand_logo ?? "",
    active: data.active,
    sellersCount,
    notes: data.notes ?? "",
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

function mapSellerUser(data: DatabaseSellerUserRow): SellerUserRecord {
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    agentName: data.agent_name,
    passwordHash: data.password_hash,
    active: data.active,
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
    lastLoginAt: data.last_login_at ? toIsoStringOrNow(data.last_login_at) : undefined,
  };
}

function mapSellerInvite(data: DatabaseSellerInviteRow): SellerInviteRecord {
  return {
    id: data.id,
    token: data.token,
    email: data.email,
    suggestedDisplayName: data.suggested_display_name ?? undefined,
    agentName: data.agent_name ?? undefined,
    note: data.note ?? undefined,
    createdByEmail: data.created_by_email,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    expiresAt: data.expires_at,
    acceptedAt: data.accepted_at ?? undefined,
    revokedAt: data.revoked_at ?? undefined,
  };
}

function mapSystemLog(data: DatabaseSystemLogRow): SystemLogRecord {
  return {
    id: data.id,
    eventType: data.event_type,
    level: data.level,
    message: data.message,
    context: data.context,
    createdAt: toIsoStringOrNow(data.created_at),
  };
}

function mapWebhookEvent(data: DatabaseWebhookEventRow): WebhookEventRecord {
  return {
    id: data.id,
    webhookId: data.webhook_id,
    eventId: data.event_id,
    eventType: data.event_type,
    payload: data.payload,
    processed: data.processed,
    duplicate: data.duplicate,
    error: data.error ?? undefined,
    source: data.source,
    createdAt: new Date(data.created_at).toISOString(),
    processedAt: data.processed_at ? new Date(data.processed_at).toISOString() : undefined,
  };
}

function mapConnectionSettings(
  data: DatabaseConnectionSettingsRow,
  fallback: ConnectionSettingsRecord,
): ConnectionSettingsRecord {
  return {
    id: data.id,
    appBaseUrl: data.app_base_url ?? fallback.appBaseUrl,
    webhookSecret: data.webhook_secret ?? fallback.webhookSecret,
    webhookToleranceSeconds:
      data.webhook_tolerance_seconds ?? fallback.webhookToleranceSeconds,
    whatsappProvider:
      data.whatsapp_provider === "web_api" ? "web_api" : "cloud_api",
    whatsappApiBaseUrl:
      data.whatsapp_api_base_url ?? fallback.whatsappApiBaseUrl,
    whatsappAccessToken:
      data.whatsapp_access_token ?? fallback.whatsappAccessToken,
    whatsappPhoneNumberId:
      data.whatsapp_phone_number_id ?? fallback.whatsappPhoneNumberId,
    whatsappBusinessAccountId:
      data.whatsapp_business_account_id ?? fallback.whatsappBusinessAccountId,
    whatsappWebhookVerifyToken:
      data.whatsapp_webhook_verify_token ?? fallback.whatsappWebhookVerifyToken,
    whatsappWebSessionId:
      data.whatsapp_web_session_id ?? fallback.whatsappWebSessionId,
    whatsappWebSessionStatus:
      data.whatsapp_web_session_status === "pending_qr" ||
      data.whatsapp_web_session_status === "connected" ||
      data.whatsapp_web_session_status === "expired" ||
      data.whatsapp_web_session_status === "error"
        ? data.whatsapp_web_session_status
        : fallback.whatsappWebSessionStatus,
    whatsappWebSessionQrCode:
      data.whatsapp_web_session_qr_code ?? fallback.whatsappWebSessionQrCode,
    whatsappWebSessionPhone:
      data.whatsapp_web_session_phone ?? fallback.whatsappWebSessionPhone,
    whatsappWebSessionError:
      data.whatsapp_web_session_error ?? fallback.whatsappWebSessionError,
    whatsappWebSessionUpdatedAt:
      data.whatsapp_web_session_updated_at ??
      fallback.whatsappWebSessionUpdatedAt,
    emailProvider: "sendgrid",
    emailApiKey: data.email_api_key ?? fallback.emailApiKey,
    emailFromAddress: data.email_from_address ?? fallback.emailFromAddress,
    crmApiUrl: data.crm_api_url ?? fallback.crmApiUrl,
    crmApiKey: data.crm_api_key ?? fallback.crmApiKey,
    openAiApiKey: data.openai_api_key ?? fallback.openAiApiKey,
    updatedAt: data.updated_at ?? fallback.updatedAt,
  };
}

function mapAgent(data: DatabaseAgentRow): AgentRecord {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    active: data.active,
    createdAt: new Date(data.created_at).toISOString(),
  };
}

function mapLead(data: DatabaseLeadRow): RecoveryLeadRecord {
  const agent = unwrapRelation(data.agent);

  return {
    id: data.id,
    paymentId: data.payment_id,
    customerId: data.customer_id,
    leadId: data.lead_id,
    customerName: data.customer_name,
    email: data.email,
    phone: data.phone,
    paymentValue: Number(data.payment_value),
    product: data.product ?? undefined,
    failureReason: data.failure_reason ?? undefined,
    status: data.status,
    assignedAgentId: data.assigned_agent_id ?? undefined,
    assignedAgentName: agent?.name ?? undefined,
    createdAt: new Date(data.created_at).toISOString(),
    updatedAt: new Date(data.updated_at).toISOString(),
    recoveredAt: data.recovered_at ? new Date(data.recovered_at).toISOString() : undefined,
  };
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSellerKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

function clampOptionalPercent(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }

  return clampPercent(value);
}

function clampLeadLimit(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}

function mapConversation(data: DatabaseConversationRow): ConversationRecord {
  const agent = unwrapRelation(data.agent);
  const lastMessageAt = toIsoStringOrNow(data.last_message_at);
  const createdAt = toIsoStringOrNow(data.created_at);
  const updatedAt = toIsoStringOrNow(data.updated_at);

  return {
    id: data.id,
    leadRecordId: data.lead_record_id ?? undefined,
    leadId: data.lead_public_id ?? undefined,
    customerId: data.customer_id ?? undefined,
    customerName: data.customer_name,
    channel: data.channel,
    contactValue: data.contact_value,
    assignedAgentId: data.assigned_agent_id ?? undefined,
    assignedAgentName: agent?.name ?? undefined,
    status: data.status,
    lastMessageAt,
    createdAt,
    updatedAt,
  };
}

function mapMessage(data: DatabaseMessageRow): MessageRecord {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    leadRecordId: data.lead_record_id ?? undefined,
    leadId: data.lead_public_id ?? undefined,
    customerId: data.customer_id ?? undefined,
    channel: data.channel,
    direction: data.direction,
    senderName: data.sender_name ?? undefined,
    senderAddress: data.sender_address,
    content: data.content ?? "",
    providerMessageId: data.provider_message_id ?? undefined,
    status: data.status,
    createdAt: toIsoStringOrNow(data.created_at),
    deliveredAt: data.delivered_at ? toIsoStringOrNow(data.delivered_at) : undefined,
    readAt: data.read_at ? toIsoStringOrNow(data.read_at) : undefined,
    error: data.error ?? undefined,
    metadata: data.metadata ?? undefined,
  };
}

function normalizePhone(value?: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeContactValue(channel: MessagingChannel, value: string) {
  if (channel === "whatsapp" || channel === "sms") {
    return normalizePhone(value);
  }

  return normalizeEmail(value);
}

function toIsoStringOrNow(value: string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

const CALENDAR_TIME_ZONE = "America/Sao_Paulo";

function buildCalendarSnapshot(input: {
  month: string;
  visibleLeadIds?: string[];
  leads: RecoveryLeadRecord[];
  payments: PaymentRecord[];
  queueJobs: QueueJobRecord[];
  messages: MessageRecord[];
  conversations: ConversationRecord[];
  calendarNotes: CalendarNoteRecord[];
}): CalendarSnapshot {
  const month = normalizeMonthKey(input.month);
  const { start, endExclusive, dateKeys } = getMonthRange(month);
  const allowedLeadIds = input.visibleLeadIds ? new Set(input.visibleLeadIds) : null;
  const visibleLeads = allowedLeadIds
    ? input.leads.filter((lead) => allowedLeadIds.has(lead.leadId))
    : input.leads;
  const visibleLeadRecordIds = new Set(visibleLeads.map((lead) => lead.id));
  const visiblePaymentIds = new Set(visibleLeads.map((lead) => lead.paymentId));
  const leadByPaymentId = new Map(visibleLeads.map((lead) => [lead.paymentId, lead]));
  const leadByPublicId = new Map(visibleLeads.map((lead) => [lead.leadId, lead]));
  const conversationById = new Map(
    input.conversations.map((conversation) => [conversation.id, conversation]),
  );
  const dayMap = new Map<string, CalendarDaySummary>(
    dateKeys.map((date) => [
      date,
      {
        date,
        recoveredRevenue: 0,
        recoveredCount: 0,
        newLeads: 0,
        automationJobs: 0,
        outboundMessages: 0,
        inboundMessages: 0,
        notesCount: 0,
      },
    ]),
  );
  const activities: CalendarActivityItem[] = [];

  visibleLeads.forEach((lead) => {
    const dateKey = toCalendarDateKey(lead.createdAt);
    if (!dateKey || !dayMap.has(dateKey)) {
      return;
    }

    dayMap.get(dateKey)!.newLeads += 1;
    activities.push({
      id: `lead-${lead.id}`,
      date: dateKey,
      at: lead.createdAt,
      type: "lead",
      title: `${lead.customerName} entrou na carteira`,
      detail: `${lead.product ?? "Lead sem produto"} · ${lead.assignedAgentName ?? "sem responsável"}`,
      leadId: lead.leadId,
      href: `/leads/${lead.leadId}`,
    });
  });

  input.payments.forEach((payment) => {
    if (allowedLeadIds && !visiblePaymentIds.has(payment.id)) {
      return;
    }

    const dateKey = toCalendarDateKey(payment.recoveredAt);
    if (!dateKey || !dayMap.has(dateKey)) {
      return;
    }

    dayMap.get(dateKey)!.recoveredRevenue += payment.amount;
    dayMap.get(dateKey)!.recoveredCount += 1;
    const lead = leadByPaymentId.get(payment.id);

    activities.push({
      id: `recovery-${payment.id}`,
      date: dateKey,
      at: payment.recoveredAt!,
      type: "recovery",
      title: `${lead?.customerName ?? "Pagamento"} recuperado`,
      detail: `${formatCalendarCurrency(payment.amount)} · ${lead?.product ?? payment.paymentMethod}`,
      amount: payment.amount,
      leadId: lead?.leadId,
      href: lead?.leadId ? `/leads/${lead.leadId}` : undefined,
    });
  });

  input.queueJobs.forEach((job) => {
    if (allowedLeadIds && !isVisibleQueueJob(job, allowedLeadIds, visiblePaymentIds)) {
      return;
    }

    const dateKey = toCalendarDateKey(job.runAt);
    if (!dateKey || !dayMap.has(dateKey)) {
      return;
    }

    dayMap.get(dateKey)!.automationJobs += 1;
    const leadId = typeof job.payload.leadId === "string" ? job.payload.leadId : undefined;

    activities.push({
      id: `job-${job.id}`,
      date: dateKey,
      at: job.runAt,
      type: "automation",
      title: mapCalendarJobTitle(job.jobType),
      detail: `${job.queueName} · ${job.status}`,
      leadId,
      href: leadId ? `/leads/${leadId}` : undefined,
    });
  });

  input.messages.forEach((message) => {
    const relatedConversation = conversationById.get(message.conversationId);
    const relatedLead =
      (message.leadId ? leadByPublicId.get(message.leadId) : undefined) ??
      (message.leadRecordId
        ? visibleLeads.find((lead) => lead.id === message.leadRecordId)
        : undefined) ??
      (relatedConversation?.leadId
        ? leadByPublicId.get(relatedConversation.leadId)
        : undefined);

    if (allowedLeadIds) {
      const visible =
        (message.leadId && allowedLeadIds.has(message.leadId)) ||
        (message.leadRecordId && visibleLeadRecordIds.has(message.leadRecordId)) ||
        (relatedConversation?.leadId && allowedLeadIds.has(relatedConversation.leadId));

      if (!visible) {
        return;
      }
    }

    const dateKey = toCalendarDateKey(message.createdAt);
    if (!dateKey || !dayMap.has(dateKey)) {
      return;
    }

    if (message.direction === "outbound") {
      dayMap.get(dateKey)!.outboundMessages += 1;
    } else {
      dayMap.get(dateKey)!.inboundMessages += 1;
    }

    activities.push({
      id: `message-${message.id}`,
      date: dateKey,
      at: message.createdAt,
      type: "message",
      title:
        message.direction === "inbound"
          ? `${relatedLead?.customerName ?? "Cliente"} respondeu`
          : `Saída para ${relatedLead?.customerName ?? "cliente"}`,
      detail: truncateCalendarText(message.content),
      leadId: relatedLead?.leadId,
      href: relatedConversation?.id
        ? `/inbox?conversationId=${relatedConversation.id}`
        : relatedLead?.leadId
          ? `/leads/${relatedLead.leadId}`
          : undefined,
    });
  });

  const notes = input.calendarNotes
    .filter((note) => note.date >= dateKeys[0] && note.date <= dateKeys[dateKeys.length - 1])
    .sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  notes.forEach((note) => {
    if (dayMap.has(note.date)) {
      dayMap.get(note.date)!.notesCount += 1;
    }
  });

  return {
    month,
    days: Array.from(dayMap.values()),
    notes,
    activities: activities
      .filter((item) => item.at >= start.toISOString() && item.at < endExclusive.toISOString())
      .sort((left, right) => {
        return new Date(right.at).getTime() - new Date(left.at).getTime();
      }),
  };
}

function normalizeMonthKey(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return toMonthKey(new Date());
}

function normalizeCalendarDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return toCalendarDateKey(value) ?? toCalendarDateKey(new Date().toISOString())!;
}

function getMonthRange(month: string) {
  const [yearValue, monthValue] = month.split("-");
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  const dateKeys: string[] = [];
  const cursor = new Date(start);

  while (cursor < endExclusive) {
    dateKeys.push(toCalendarDateKey(cursor.toISOString())!);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { start, endExclusive, dateKeys };
}

function toMonthKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toCalendarDateKey(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function formatCalendarCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function truncateCalendarText(value: string, max = 84) {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, max - 1)}…`;
}

function isVisibleQueueJob(
  job: QueueJobRecord,
  visibleLeadIds: Set<string>,
  visiblePaymentIds: Set<string>,
) {
  const leadId = typeof job.payload.leadId === "string" ? job.payload.leadId : undefined;
  const paymentId =
    typeof job.payload.paymentId === "string" ? job.payload.paymentId : undefined;

  if (leadId) {
    return visibleLeadIds.has(leadId);
  }

  if (paymentId) {
    return visiblePaymentIds.has(paymentId);
  }

  return false;
}

function queueJobPriority(jobType: string) {
  switch (jobType) {
    case "webhook-process":
      return 0;
    case "payment-link-generated":
      return 1;
    case "lead-created":
      return 2;
    case "whatsapp-initial":
      return 3;
    case "email-reminder":
      return 4;
    case "whatsapp-follow-up":
      return 5;
    case "agent-task":
      return 6;
    default:
      return 20;
  }
}

/* ── Call mappers ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapCall(data: any): CallRecord {
  return {
    id: data.id,
    campaignId: data.campaign_id ?? undefined,
    leadId: data.lead_id ?? undefined,
    customerId: data.customer_id ?? undefined,
    agentId: data.agent_id ?? undefined,
    direction: data.direction ?? "outbound",
    fromNumber: data.from_number ?? undefined,
    toNumber: data.to_number ?? "",
    status: data.status ?? "queued",
    startedAt: data.started_at ? new Date(data.started_at).toISOString() : undefined,
    answeredAt: data.answered_at ? new Date(data.answered_at).toISOString() : undefined,
    endedAt: data.ended_at ? new Date(data.ended_at).toISOString() : undefined,
    durationSeconds: Number(data.duration_seconds) || 0,
    ringDurationSeconds: Number(data.ring_duration_seconds) || 0,
    recordingUrl: data.recording_url ?? undefined,
    recordingDurationSeconds: data.recording_duration_seconds != null ? Number(data.recording_duration_seconds) : undefined,
    transcript: data.transcript ?? undefined,
    transcriptSummary: data.transcript_summary ?? undefined,
    outcome: data.outcome ?? undefined,
    outcomeNotes: data.outcome_notes ?? undefined,
    callbackScheduledAt: data.callback_scheduled_at ? new Date(data.callback_scheduled_at).toISOString() : undefined,
    provider: data.provider ?? "vapi",
    providerCallId: data.provider_call_id ?? undefined,
    providerCost: data.provider_cost != null ? Number(data.provider_cost) : undefined,
    sentiment: data.sentiment ?? undefined,
    copy: data.copy ?? undefined,
    product: data.product ?? undefined,
    discountPercent: data.discount_percent != null ? Number(data.discount_percent) : undefined,
    couponCode: data.coupon_code ?? undefined,
    chosenPaymentMethod: data.chosen_payment_method ?? undefined,
    checkoutSessionId: data.checkout_session_id ?? undefined,
    checkoutUrl: data.checkout_url ?? undefined,
    voiceTone: data.voice_tone ?? undefined,
    voiceGender: data.voice_gender ?? undefined,
    sellerKey: data.seller_key ?? undefined,
    metadata: data.metadata ?? {},
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapCallcenterSettings(data: any): CallcenterSettingsRecord {
  return {
    id: data.id,
    sellerKey: data.seller_key,
    voiceTone: data.voice_tone ?? "empathetic",
    voiceGender: data.voice_gender ?? "female",
    discountPercent: Number(data.discount_percent) || 0,
    couponCode: data.coupon_code ?? "",
    defaultCopy: data.default_copy ?? "",
    defaultProduct: data.default_product ?? "",
    provider: data.provider ?? "vapi",
    maxCallsPerDay: Number(data.max_calls_per_day) || 50,
    autoCallEnabled: data.auto_call_enabled ?? false,
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapCallCampaign(data: any): CallCampaignRecord {
  return {
    id: data.id,
    name: data.name ?? "",
    description: data.description ?? "",
    status: data.status ?? "draft",
    filterCriteria: data.filter_criteria ?? {},
    totalContacts: Number(data.total_contacts) || 0,
    completedContacts: Number(data.completed_contacts) || 0,
    successfulContacts: Number(data.successful_contacts) || 0,
    createdBy: data.created_by ?? undefined,
    startedAt: data.started_at ? new Date(data.started_at).toISOString() : undefined,
    completedAt: data.completed_at ? new Date(data.completed_at).toISOString() : undefined,
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapCallEvent(data: any): CallEventRecord {
  return {
    id: data.id,
    callId: data.call_id,
    eventType: data.event_type,
    data: data.data ?? {},
    createdAt: toIsoStringOrNow(data.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapQuizLead(data: any): QuizLeadRecord {
  return {
    id: data.id,
    email: data.email,
    answers: Array.isArray(data.answers) ? data.answers : [],
    status: data.status ?? "new",
    whatsappSentAt: data.whatsapp_sent_at ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: toIsoStringOrNow(data.created_at),
  };
}

function mapDemoCallLead(data: DatabaseDemoCallLeadRow): DemoCallLeadRecord {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    calledAt: data.called_at ?? undefined,
    vapiCallId: data.vapi_call_id ?? undefined,
    status: data.status as DemoCallLeadRecord["status"],
    createdAt: toIsoStringOrNow(data.created_at),
  };
}

function mapAffiliateLink(data: Record<string, unknown>): AffiliateLinkRecord {
  return {
    id: String(data.id),
    sellerKey: String(data.seller_key),
    sellerEmail: String(data.seller_email),
    code: String(data.code),
    label: data.label ? String(data.label) : undefined,
    commissionPct: Number(data.commission_pct ?? 5),
    clicks: Number(data.clicks ?? 0),
    active: Boolean(data.active),
    createdAt: toIsoStringOrNow(data.created_at as string),
    updatedAt: toIsoStringOrNow(data.updated_at as string),
  };
}

function mapAffiliateReferral(data: Record<string, unknown>): AffiliateReferralRecord {
  return {
    id: String(data.id),
    affiliateLinkId: String(data.affiliate_link_id),
    referrerSellerKey: String(data.referrer_seller_key),
    referredEmail: String(data.referred_email),
    referredSellerKey: data.referred_seller_key ? String(data.referred_seller_key) : undefined,
    status: String(data.status) as AffiliateReferralRecord["status"],
    createdAt: toIsoStringOrNow(data.created_at as string),
    activatedAt: data.activated_at ? String(data.activated_at) : undefined,
  };
}

function mapCalendarJobTitle(jobType: string) {
  switch (jobType) {
    case "lead-created":
      return "Lead entrou no fluxo";
    case "whatsapp-initial":
      return "Primeiro WhatsApp programado";
    case "email-reminder":
      return "Lembrete por email";
    case "whatsapp-follow-up":
      return "Follow-up de WhatsApp";
    case "agent-task":
      return "Tarefa manual do time";
    case "payment-link-generated":
      return "Novo link de pagamento";
    default:
      return jobType;
  }
}

/* ── New mappers: opt-out, frequency, templates, A/B, funnel ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapOptOut(data: any): OptOutRecord {
  return {
    id: String(data.id),
    channel: data.channel,
    contactValue: String(data.contact_value),
    reason: String(data.reason ?? "unspecified"),
    optedOutAt: toIsoStringOrNow(data.opted_out_at),
    source: data.source ?? "api",
    sellerKey: data.seller_key ? String(data.seller_key) : undefined,
    metadata: (data.metadata && typeof data.metadata === "object") ? data.metadata : {},
    createdAt: toIsoStringOrNow(data.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapFrequencyLog(data: any): FrequencyLogRecord {
  return {
    id: String(data.id),
    contactValue: String(data.contact_value),
    channel: String(data.channel),
    direction: String(data.direction ?? "outbound"),
    sentAt: toIsoStringOrNow(data.sent_at),
    messageId: data.message_id ? String(data.message_id) : undefined,
    callId: data.call_id ? String(data.call_id) : undefined,
    sellerKey: data.seller_key ? String(data.seller_key) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapMessageTemplate(data: any): MessageTemplateRecord {
  return {
    id: String(data.id),
    name: String(data.name),
    slug: String(data.slug ?? ""),
    category: data.category ?? "recovery",
    vertical: data.vertical ?? "general",
    channel: String(data.channel ?? "whatsapp"),
    subject: data.subject ? String(data.subject) : undefined,
    bodyWhatsapp: String(data.body_whatsapp ?? ""),
    bodySms: data.body_sms ? String(data.body_sms) : undefined,
    bodyEmailHtml: data.body_email_html ? String(data.body_email_html) : undefined,
    bodyEmailText: data.body_email_text ? String(data.body_email_text) : undefined,
    variables: Array.isArray(data.variables) ? data.variables : [],
    active: Boolean(data.active ?? true),
    usageCount: Number(data.usage_count ?? 0),
    conversionCount: Number(data.conversion_count ?? 0),
    sellerKey: data.seller_key ? String(data.seller_key) : undefined,
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapABTest(data: any): ABTestRecord {
  return {
    id: String(data.id),
    name: String(data.name),
    status: data.status ?? "draft",
    templateAId: String(data.template_a_id),
    templateBId: String(data.template_b_id),
    channel: String(data.channel ?? "whatsapp"),
    sellerKey: data.seller_key ? String(data.seller_key) : undefined,
    totalSentA: Number(data.total_sent_a ?? 0),
    totalSentB: Number(data.total_sent_b ?? 0),
    totalDeliveredA: Number(data.total_delivered_a ?? 0),
    totalDeliveredB: Number(data.total_delivered_b ?? 0),
    totalClickedA: Number(data.total_clicked_a ?? 0),
    totalClickedB: Number(data.total_clicked_b ?? 0),
    totalConvertedA: Number(data.total_converted_a ?? 0),
    totalConvertedB: Number(data.total_converted_b ?? 0),
    winner: data.winner ?? undefined,
    confidencePct: data.confidence_pct != null ? Number(data.confidence_pct) : undefined,
    startedAt: data.started_at ? new Date(data.started_at).toISOString() : undefined,
    completedAt: data.completed_at ? new Date(data.completed_at).toISOString() : undefined,
    createdAt: toIsoStringOrNow(data.created_at),
    updatedAt: toIsoStringOrNow(data.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapABTestAssignment(data: any): ABTestAssignmentRecord {
  return {
    id: String(data.id),
    abTestId: String(data.ab_test_id),
    contactValue: String(data.contact_value),
    variant: data.variant,
    messageId: data.message_id ? String(data.message_id) : undefined,
    delivered: Boolean(data.delivered ?? false),
    clicked: Boolean(data.clicked ?? false),
    converted: Boolean(data.converted ?? false),
    createdAt: toIsoStringOrNow(data.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase row mapper
function mapFunnelSnapshot(data: any): RecoveryFunnelSnapshot {
  return {
    id: String(data.id),
    snapshotDate: String(data.snapshot_date),
    sellerKey: data.seller_key ? String(data.seller_key) : undefined,
    channel: String(data.channel),
    totalSent: Number(data.total_sent ?? 0),
    totalDelivered: Number(data.total_delivered ?? 0),
    totalRead: Number(data.total_read ?? 0),
    totalClicked: Number(data.total_clicked ?? 0),
    totalConverted: Number(data.total_converted ?? 0),
    totalOptedOut: Number(data.total_opted_out ?? 0),
    totalRevenueRecovered: Number(data.total_revenue_recovered ?? 0),
    createdAt: toIsoStringOrNow(data.created_at),
  };
}
