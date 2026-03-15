import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { appEnv, createDefaultConnectionSettings } from "@/server/recovery/config";
import type {
  AgentRecord,
  ConnectionSettingsInput,
  ConnectionSettingsRecord,
  ConversationRecord,
  ConversationStatus,
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
  RecoveryAnalytics,
  RecoveryLeadRecord,
  RecoveryLeadStatus,
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
  source: "shield-gateway";
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
    payload: unknown;
  }): Promise<WebhookEventRecord> {
    const { data, error } = await this.supabase
      .from("webhook_events")
      .insert({
        webhook_id: input.webhookId,
        event_id: input.eventId,
        event_type: input.eventType,
        source: "shield-gateway",
        payload: input.payload,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create webhook event: ${error.message}`);
    return mapWebhookEvent(data);
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
    // Try to find existing
    const { data: existing } = await this.supabase
      .from("customers")
      .select("*")
      .or(`gateway_customer_id.eq.${normalizedEvent.customer.id},email.eq.${normalizedEvent.customer.email}`)
      .maybeSingle();

    if (existing) {
      const { data, error } = await this.supabase
        .from("customers")
        .update({
          gateway_customer_id: normalizedEvent.customer.id,
          name: normalizedEvent.customer.name,
          email: normalizedEvent.customer.email,
          phone: normalizedEvent.customer.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapCustomer(data);
    } else {
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
      if (error) throw error;
      return mapCustomer(data);
    }
  }

  async upsertPayment(
    normalizedEvent: NormalizedPaymentEvent,
    customerId: string,
  ): Promise<PaymentRecord> {
    const markAsFailure =
      normalizedEvent.event_type === "payment_failed" ||
      normalizedEvent.event_type === "payment_refused" ||
      normalizedEvent.event_type === "payment_expired";

    const { data: existing } = await this.supabase
      .from("payments")
      .select("*")
      .or(`gateway_payment_id.eq.${normalizedEvent.payment.id},order_id.eq.${normalizedEvent.payment.order_id}`)
      .maybeSingle();

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
      if (error) throw error;
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
      if (error) throw error;
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
  }): Promise<RecoveryLeadRecord | undefined> {
    const { data, error } = await this.supabase
      .from("recovery_leads")
      .update({
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("lead_id", input.leadId)
      .select("*, agent:agents(*)")
      .maybeSingle();

    if (error || !data) return undefined;
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
        last_message_at: lastMessage?.created_at ?? conversation.last_message_at,
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
    return `${appEnv.appBaseUrl}/api/webhooks/shield-gateway`;
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

function mapConversation(data: DatabaseConversationRow): ConversationRecord {
  const agent = unwrapRelation(data.agent);

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
    lastMessageAt: new Date(data.last_message_at).toISOString(),
    createdAt: new Date(data.created_at).toISOString(),
    updatedAt: new Date(data.updated_at).toISOString(),
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
    content: data.content,
    providerMessageId: data.provider_message_id ?? undefined,
    status: data.status,
    createdAt: new Date(data.created_at).toISOString(),
    deliveredAt: data.delivered_at ? new Date(data.delivered_at).toISOString() : undefined,
    readAt: data.read_at ? new Date(data.read_at).toISOString() : undefined,
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
