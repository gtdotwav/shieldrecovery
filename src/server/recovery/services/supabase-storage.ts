import { randomUUID } from "node:crypto";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { buildGatewayWebhookPath, platformBrand } from "@/lib/platform";
import { appEnv, createDefaultConnectionSettings } from "@/server/recovery/config";
import type {
  AgentRecord,
  CalendarActivityItem,
  CalendarDaySummary,
  CalendarNoteRecord,
  CalendarSnapshot,
  ConnectionSettingsInput,
  ConnectionSettingsRecord,
  ConversationRecord,
  ConversationStatus,
  CreateCalendarNoteInput,
  CustomerRecord,
  FollowUpContact,
  InboxConversation,
  MessageMetadata,
  MessageRecord,
  MessageStatus,
  MessagingChannel,
  NormalizedPaymentEvent,
  PaymentAttemptRecord,
  PaymentRecord,
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
  WebhookEventRecord,
} from "@/server/recovery/types";
import { RecoveryStorage } from "@/server/recovery/services/storage";

interface PaymentAnalyticsData {
  amount: string | number;
  first_failure_at: string | null;
  recovered_at: string | null;
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
  }): Promise<WebhookEventRecord> {
    const { data, error } = await this.supabase
      .from("webhook_events")
      .insert({
        webhook_id: input.webhookId,
        event_id: input.eventId,
        event_type: input.eventType,
        source: input.source ?? platformBrand.gateway.slug,
        payload: input.payload,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create webhook event: ${error.message}`);
    return mapWebhookEvent(data);
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
    // Prefer exact gateway_customer_id match, then fall back to email match
    const { data: byGatewayId } = await this.supabase
      .from("customers")
      .select("*")
      .eq("gateway_customer_id", normalizedEvent.customer.id)
      .limit(1);

    const existing = byGatewayId?.[0] ?? null;

    if (existing) {
      const { data, error } = await this.supabase
        .from("customers")
        .update({
          name: normalizedEvent.customer.name,
          email: normalizedEvent.customer.email,
          phone: normalizedEvent.customer.phone,
          updated_at: new Date().toISOString(),
        })
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
      const { data, error } = await this.supabase
        .from("customers")
        .update({
          name: normalizedEvent.customer.name,
          phone: normalizedEvent.customer.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", emailMatch.id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update customer by email: ${error.message}`);
      return mapCustomer(data);
    }

    // Insert new customer
    const { data, error } = await this.supabase
      .from("customers")
      .insert({
        gateway_customer_id: normalizedEvent.customer.id,
        name: normalizedEvent.customer.name,
        email: normalizedEvent.customer.email,
        phone: normalizedEvent.customer.phone,
      })
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
      .or(`gateway_payment_id.eq.${normalizedEvent.payment.id},order_id.eq.${normalizedEvent.payment.order_id}`)
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
      const { data, error } = await this.supabase
        .from("payments")
        .insert({
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
        })
        .select()
        .single();
      if (error) throw new Error(`Failed to insert payment: ${error.message}`);
      return mapPayment(data);
    }
  }

  async findPayment(input: {
    paymentId?: string;
    gatewayPaymentId?: string;
    orderId?: string;
  }): Promise<PaymentRecord | undefined> {
    const conditions = [];
    if (input.paymentId) conditions.push(`id.eq.${input.paymentId}`);
    if (input.gatewayPaymentId) conditions.push(`gateway_payment_id.eq.${input.gatewayPaymentId}`);
    if (input.orderId) conditions.push(`order_id.eq.${input.orderId}`);

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

    const { data } = await this.supabase
      .from("recovery_leads")
      .select("*, agent:agents(*)")
      .not("status", "in", '("RECOVERED","LOST")')
      .order("updated_at", { ascending: false });

    const lead = ((data as DatabaseLeadRow[] | null) || []).find((item) => {
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
          phone: input.phone ?? existing.phone ?? "",
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
        phone: input.phone ?? "",
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

    if (existing) {
      const { data, error } = await this.supabase
        .from("recovery_leads")
        .update({
          customer_name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
          payment_value: input.payment.amount,
          product: input.product,
          failure_reason: input.failureReason,
          status: existing.status === "RECOVERED" ? "RECOVERED" : input.status,
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
          phone: input.customer.phone,
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

    const { data, error } = await this.supabase
      .from("queue_jobs")
      .select("*")
      .eq("status", "scheduled")
      .lte("run_at", runUntil)
      .order("run_at", { ascending: true })
      .limit(selectionWindow);

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
    await this.supabase
      .from("queue_jobs")
      .update({
        status: "processed",
        error: null,
      })
      .eq("id", jobId);
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

    const { data, error } = await this.supabase
      .from("queue_jobs")
      .update(update)
      .eq("id", input.jobId)
      .select("*")
      .maybeSingle();

    if (error || !data) return undefined;
    return mapQueueJob(data);
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

    const { data: existing } = await this.supabase
      .from("conversations")
      .select("*, agent:agents(*)")
      .eq("channel", input.channel)
      .eq("contact_value", normalizedContact)
      .maybeSingle();

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
    await this.supabase.from("system_logs").insert({
      id: log.id,
      event_type: log.eventType,
      level: log.level,
      message: log.message,
      context: log.context,
      created_at: new Date(log.createdAt).toISOString(),
    });
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

  async getAnalytics(): Promise<RecoveryAnalytics> {
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

  async getFollowUpContacts(): Promise<FollowUpContact[]> {
    const { data: leads } = await this.supabase
      .from("recovery_leads")
      .select("*, payment:payments(*), agent:agents(*)")
      .order("updated_at", { ascending: false });

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

  async getInboxConversations(): Promise<InboxConversation[]> {
    const { data: conversations } = await this.supabase
      .from("conversations")
      .select("*, agent:agents(*)")
      .order("last_message_at", { ascending: false });

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
    notes: data.notes ?? undefined,
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
  return value.replace(/\D/g, "");
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
  }).format(value);
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
