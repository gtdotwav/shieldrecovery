import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { appEnv } from "@/server/recovery/config";
import { createDefaultConnectionSettings } from "@/server/recovery/config";
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
  StorageState,
  SystemLogRecord,
  WebhookEventRecord,
} from "@/server/recovery/types";

export type StorageMode = "local_json" | "supabase";

import { SupabaseStorageService } from "./supabase-storage";
import { getPlatformBootstrapService } from "./platform-bootstrap-service";

export interface RecoveryStorage {
  readonly mode: StorageMode;
  clearOperationalData(): Promise<void>;
  findWebhookByWebhookId(webhookId: string): Promise<WebhookEventRecord | undefined>;
  createWebhookEvent(input: {
    webhookId: string;
    eventId: string;
    eventType: string;
    payload: unknown;
  }): Promise<WebhookEventRecord>;
  markWebhookProcessed(input: {
    webhookRecordId: string;
    eventId: string;
    eventType: string;
  }): Promise<void>;
  markWebhookFailed(webhookRecordId: string, errorMessage: string): Promise<void>;
  upsertCustomer(normalizedEvent: NormalizedPaymentEvent): Promise<CustomerRecord>;
  upsertPayment(
    normalizedEvent: NormalizedPaymentEvent,
    customerId: string,
  ): Promise<PaymentRecord>;
  findPayment(input: {
    paymentId?: string;
    gatewayPaymentId?: string;
    orderId?: string;
  }): Promise<PaymentRecord | undefined>;
  findCustomer(customerId: string): Promise<CustomerRecord | undefined>;
  findLeadByContact(input: {
    phone?: string;
    email?: string;
  }): Promise<RecoveryLeadRecord | undefined>;
  getActiveAgents(): Promise<AgentRecord[]>;
  assignAgentRoundRobin(): Promise<AgentRecord | undefined>;
  upsertLead(input: {
    payment: PaymentRecord;
    customer: CustomerRecord;
    status: RecoveryLeadStatus;
    product?: string;
    failureReason?: string;
    assignedAgent?: AgentRecord;
  }): Promise<RecoveryLeadRecord>;
  markLeadRecovered(paymentId: string): Promise<RecoveryLeadRecord | undefined>;
  markLeadLost(paymentId: string): Promise<RecoveryLeadRecord | undefined>;
  updateLeadStatus(input: {
    leadId: string;
    status: RecoveryLeadStatus;
  }): Promise<RecoveryLeadRecord | undefined>;
  createQueueJobs(jobs: QueueJobRecord[]): Promise<QueueJobRecord[]>;
  createPaymentAttempt(input: {
    paymentId: string;
    paymentLink: string;
    failureReason?: string;
  }): Promise<PaymentAttemptRecord>;
  upsertConversation(input: {
    channel: MessagingChannel;
    contactValue: string;
    customerName: string;
    lead?: RecoveryLeadRecord;
    customerId?: string;
  }): Promise<ConversationRecord>;
  findConversationById(conversationId: string): Promise<ConversationRecord | undefined>;
  updateConversationStatus(input: {
    conversationId: string;
    status: ConversationStatus;
  }): Promise<ConversationRecord | undefined>;
  createMessage(input: {
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
  }): Promise<MessageRecord>;
  updateMessageStatus(input: {
    providerMessageId: string;
    status: MessageStatus;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
  }): Promise<MessageRecord | undefined>;
  addLog(log: SystemLogRecord): Promise<void>;
  getAnalytics(): Promise<RecoveryAnalytics>;
  getFollowUpContacts(): Promise<FollowUpContact[]>;
  getInboxConversations(): Promise<InboxConversation[]>;
  getConversationMessages(conversationId: string): Promise<MessageRecord[]>;
  getConnectionSettings(): Promise<ConnectionSettingsRecord>;
  saveConnectionSettings(
    input: ConnectionSettingsInput,
  ): Promise<ConnectionSettingsRecord>;
  getWebhookUrl(): string;
}

const DEFAULT_AGENTS: AgentRecord[] = [];

function createEmptyState(): StorageState {
  return {
    payments: [],
    customers: [],
    paymentAttempts: [],
    webhookEvents: [],
    agents: DEFAULT_AGENTS,
    leads: [],
    queueJobs: [],
    conversations: [],
    messages: [],
    logs: [],
    connectionSettings: createDefaultConnectionSettings(),
    meta: {
      lastAssignedAgentIndex: -1,
    },
  };
}

function hydrateState(partial: Partial<StorageState>): StorageState {
  const baseState = createEmptyState();

  return stabilizeState({
    ...baseState,
    ...partial,
    payments: partial.payments ?? baseState.payments,
    customers: partial.customers ?? baseState.customers,
    paymentAttempts: partial.paymentAttempts ?? baseState.paymentAttempts,
    webhookEvents: partial.webhookEvents ?? baseState.webhookEvents,
    agents: partial.agents ?? baseState.agents,
    leads: partial.leads ?? baseState.leads,
    queueJobs: partial.queueJobs ?? baseState.queueJobs,
    conversations: partial.conversations ?? baseState.conversations,
    messages: partial.messages ?? baseState.messages,
    logs: partial.logs ?? baseState.logs,
    connectionSettings: {
      ...baseState.connectionSettings,
      ...(partial.connectionSettings ?? {}),
    },
    meta: {
      ...baseState.meta,
      ...(partial.meta ?? {}),
    },
  });
}

function stabilizeState(state: StorageState): StorageState {
  const agentById = new Map(state.agents.map((agent) => [agent.id, agent]));
  const customerIds = new Set(state.customers.map((customer) => customer.id));
  const paymentIds = new Set(state.payments.map((payment) => payment.id));

  const leads = state.leads
    .filter((lead) => paymentIds.has(lead.paymentId) && customerIds.has(lead.customerId))
    .map((lead) => ({
      ...lead,
      assignedAgentName:
        lead.assignedAgentName ??
        (lead.assignedAgentId ? agentById.get(lead.assignedAgentId)?.name : undefined),
    }));

  const leadRecordIds = new Set(leads.map((lead) => lead.id));
  const leadPublicIds = new Set(leads.map((lead) => lead.leadId));
  const paymentAttempts = state.paymentAttempts.filter((attempt) =>
    paymentIds.has(attempt.paymentId),
  );

  const conversations = state.conversations.map((conversation) => {
    const hasLeadRecord =
      conversation.leadRecordId && leadRecordIds.has(conversation.leadRecordId);
    const hasLeadPublic = conversation.leadId && leadPublicIds.has(conversation.leadId);

    return {
      ...conversation,
      leadRecordId: hasLeadRecord ? conversation.leadRecordId : undefined,
      leadId: hasLeadRecord || hasLeadPublic ? conversation.leadId : undefined,
      assignedAgentName:
        conversation.assignedAgentName ??
        (conversation.assignedAgentId
          ? agentById.get(conversation.assignedAgentId)?.name
          : undefined),
      assignedAgentId:
        conversation.assignedAgentId &&
        agentById.has(conversation.assignedAgentId)
          ? conversation.assignedAgentId
          : undefined,
    };
  });

  const conversationIds = new Set(conversations.map((conversation) => conversation.id));
  const messages = state.messages
    .filter((message) => conversationIds.has(message.conversationId))
    .map((message) => {
      const hasLeadRecord =
        message.leadRecordId && leadRecordIds.has(message.leadRecordId);
      const hasLeadPublic = message.leadId && leadPublicIds.has(message.leadId);

      return {
        ...message,
        leadRecordId: hasLeadRecord ? message.leadRecordId : undefined,
        leadId: hasLeadRecord || hasLeadPublic ? message.leadId : undefined,
      };
    });

  return {
    ...state,
    leads,
    paymentAttempts,
    conversations,
    messages,
  };
}

class LocalStorageService implements RecoveryStorage {
  readonly mode = "local_json" as const;

  private cache: StorageState | null = null;
  private readonly filePath = appEnv.localStorePath;

  private readStateFromDisk(): StorageState | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, "utf8");
        return hydrateState(JSON.parse(fileContent) as Partial<StorageState>);
      }
    } catch {
      // Fall back to the in-memory snapshot if the local file is not available.
    }

    return null;
  }

  private readState(): StorageState {
    const diskState = this.readStateFromDisk();

    if (diskState) {
      this.cache = diskState;
      return diskState;
    }

    if (this.cache) {
      this.cache = hydrateState(this.cache);
      return this.cache;
    }

    this.cache = hydrateState({});
    this.writeState(this.cache);
    return this.cache;
  }

  private writeState(state: StorageState): void {
    const nextState = hydrateState(state);
    this.cache = nextState;

    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.${process.pid}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(nextState, null, 2), "utf8");
      fs.renameSync(tempPath, this.filePath);
    } catch {
      // In serverless previews the filesystem can be ephemeral. Keeping the
      // in-memory cache still allows webhook testing and local operation.
    }
  }

  private mutate<T>(mutator: (state: StorageState) => T): T {
    // Always start from the latest on-disk snapshot to avoid stale worker caches
    // overwriting more recent updates from another request/runtime.
    const state = this.readStateFromDisk() ?? this.readState();
    this.cache = state;
    const result = mutator(state);
    this.writeState(state);
    return result;
  }

  async clearOperationalData(): Promise<void> {
    this.mutate((state) => {
      state.payments = [];
      state.customers = [];
      state.paymentAttempts = [];
      state.webhookEvents = [];
      state.agents = state.agents.filter(
        (agent) => !agent.email.endsWith("@shield.local"),
      );
      state.leads = [];
      state.queueJobs = [];
      state.conversations = [];
      state.messages = [];
      state.logs = [];
      state.meta = {
        lastAssignedAgentIndex: -1,
      };
    });
  }

  async findWebhookByWebhookId(webhookId: string): Promise<WebhookEventRecord | undefined> {
    return this.readState().webhookEvents.find((event) => event.webhookId === webhookId);
  }

  async createWebhookEvent(input: {
    webhookId: string;
    eventId: string;
    eventType: string;
    payload: unknown;
  }): Promise<WebhookEventRecord> {
    return this.mutate((state) => {
      const record: WebhookEventRecord = {
        id: randomUUID(),
        webhookId: input.webhookId,
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload,
        processed: false,
        duplicate: false,
        source: "shield-gateway",
        createdAt: new Date().toISOString(),
      };

      state.webhookEvents.unshift(record);
      return record;
    });
  }

  async markWebhookProcessed(input: {
    webhookRecordId: string;
    eventId: string;
    eventType: string;
  }): Promise<void> {
    this.mutate((state) => {
      const record = state.webhookEvents.find((event) => event.id === input.webhookRecordId);

      if (record) {
        record.processed = true;
        record.eventId = input.eventId;
        record.eventType = input.eventType;
        record.processedAt = new Date().toISOString();
      }
    });
  }

  async markWebhookFailed(webhookRecordId: string, errorMessage: string): Promise<void> {
    this.mutate((state) => {
      const record = state.webhookEvents.find((event) => event.id === webhookRecordId);

      if (record) {
        record.error = errorMessage;
        record.processedAt = new Date().toISOString();
      }
    });
  }

  async upsertCustomer(normalizedEvent: NormalizedPaymentEvent): Promise<CustomerRecord> {
    return this.mutate((state) => {
      const timestamp = new Date().toISOString();
      const existing =
        state.customers.find(
          (customer) =>
            customer.gatewayCustomerId === normalizedEvent.customer.id ||
            customer.email === normalizedEvent.customer.email,
        ) ?? null;

      if (existing) {
        existing.gatewayCustomerId = normalizedEvent.customer.id;
        existing.name = normalizedEvent.customer.name;
        existing.email = normalizedEvent.customer.email;
        existing.phone = normalizedEvent.customer.phone;
        existing.updatedAt = timestamp;
        return existing;
      }

      const customer: CustomerRecord = {
        id: randomUUID(),
        gatewayCustomerId: normalizedEvent.customer.id,
        name: normalizedEvent.customer.name,
        email: normalizedEvent.customer.email,
        phone: normalizedEvent.customer.phone,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.customers.unshift(customer);
      return customer;
    });
  }

  async upsertPayment(
    normalizedEvent: NormalizedPaymentEvent,
    customerId: string,
  ): Promise<PaymentRecord> {
    return this.mutate((state) => {
      const timestamp = new Date().toISOString();
      const existing =
        state.payments.find(
          (payment) =>
            payment.gatewayPaymentId === normalizedEvent.payment.id ||
            payment.orderId === normalizedEvent.payment.order_id,
        ) ?? null;

      const markAsFailure =
        normalizedEvent.event_type === "payment_failed" ||
        normalizedEvent.event_type === "payment_refused" ||
        normalizedEvent.event_type === "payment_expired";

      if (existing) {
        existing.orderId = normalizedEvent.payment.order_id;
        existing.customerId = customerId;
        existing.status = normalizedEvent.payment.status;
        existing.amount = normalizedEvent.payment.amount;
        existing.currency = normalizedEvent.payment.currency;
        existing.paymentMethod = normalizedEvent.payment.method;
        existing.failureCode = normalizedEvent.payment.failure_code;
        existing.updatedAt = timestamp;

        if (markAsFailure && !existing.firstFailureAt) {
          existing.firstFailureAt = timestamp;
        }

        if (normalizedEvent.event_type === "payment_succeeded" && existing.firstFailureAt) {
          existing.recoveredAt = timestamp;
        }

        return existing;
      }

      const payment: PaymentRecord = {
        id: randomUUID(),
        gatewayPaymentId: normalizedEvent.payment.id,
        orderId: normalizedEvent.payment.order_id,
        customerId,
        status: normalizedEvent.payment.status,
        amount: normalizedEvent.payment.amount,
        currency: normalizedEvent.payment.currency,
        paymentMethod: normalizedEvent.payment.method,
        failureCode: normalizedEvent.payment.failure_code,
        createdAt: timestamp,
        updatedAt: timestamp,
        firstFailureAt: markAsFailure ? timestamp : undefined,
        recoveredAt:
          normalizedEvent.event_type === "payment_succeeded" ? timestamp : undefined,
      };

      state.payments.unshift(payment);
      return payment;
    });
  }

  async findPayment(input: {
    paymentId?: string;
    gatewayPaymentId?: string;
    orderId?: string;
  }): Promise<PaymentRecord | undefined> {
    return this.readState().payments.find(
      (payment) =>
        payment.id === input.paymentId ||
        payment.gatewayPaymentId === input.gatewayPaymentId ||
        payment.orderId === input.orderId,
    );
  }

  async findCustomer(customerId: string): Promise<CustomerRecord | undefined> {
    return this.readState().customers.find((customer) => customer.id === customerId);
  }

  async findLeadByContact(input: {
    phone?: string;
    email?: string;
  }): Promise<RecoveryLeadRecord | undefined> {
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedEmail = normalizeEmail(input.email);

    return this.readState().leads
      .filter((lead) => lead.status !== "RECOVERED" && lead.status !== "LOST")
      .filter((lead) => {
        if (normalizedPhone && normalizePhone(lead.phone) === normalizedPhone) {
          return true;
        }

        if (normalizedEmail && normalizeEmail(lead.email) === normalizedEmail) {
          return true;
        }

        return false;
      })
      .sort((left, right) => {
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      })[0];
  }

  async getActiveAgents(): Promise<AgentRecord[]> {
    return this.readState().agents.filter((agent) => agent.active);
  }

  async assignAgentRoundRobin(): Promise<AgentRecord | undefined> {
    return this.mutate((state) => {
      const activeAgents = state.agents.filter((agent) => agent.active);

      if (!activeAgents.length) {
        return undefined;
      }

      state.meta.lastAssignedAgentIndex =
        (state.meta.lastAssignedAgentIndex + 1) % activeAgents.length;

      return activeAgents[state.meta.lastAssignedAgentIndex];
    });
  }

  async upsertLead(input: {
    payment: PaymentRecord;
    customer: CustomerRecord;
    status: RecoveryLeadStatus;
    product?: string;
    failureReason?: string;
    assignedAgent?: AgentRecord;
  }): Promise<RecoveryLeadRecord> {
    return this.mutate((state) => {
      const timestamp = new Date().toISOString();
      const existing =
        state.leads.find((lead) => lead.paymentId === input.payment.id) ?? null;

      if (existing) {
        existing.customerName = input.customer.name;
        existing.email = input.customer.email;
        existing.phone = input.customer.phone;
        existing.paymentValue = input.payment.amount;
        existing.product = input.product;
        existing.failureReason = input.failureReason;
        existing.status = existing.status === "RECOVERED" ? "RECOVERED" : input.status;
        existing.updatedAt = timestamp;

        if (input.assignedAgent && !existing.assignedAgentId) {
          existing.assignedAgentId = input.assignedAgent.id;
          existing.assignedAgentName = input.assignedAgent.name;
        }

        return existing;
      }

      const lead: RecoveryLeadRecord = {
        id: randomUUID(),
        paymentId: input.payment.id,
        customerId: input.customer.id,
        leadId: `lead_${input.payment.gatewayPaymentId}`,
        customerName: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        paymentValue: input.payment.amount,
        product: input.product,
        failureReason: input.failureReason,
        status: input.status,
        assignedAgentId: input.assignedAgent?.id,
        assignedAgentName: input.assignedAgent?.name,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.leads.unshift(lead);
      return lead;
    });
  }

  async markLeadRecovered(paymentId: string): Promise<RecoveryLeadRecord | undefined> {
    return this.mutate((state) => {
      const lead = state.leads.find((item) => item.paymentId === paymentId);

      if (!lead) {
        return undefined;
      }

      lead.status = "RECOVERED";
      lead.updatedAt = new Date().toISOString();
      lead.recoveredAt = lead.updatedAt;
      return lead;
    });
  }

  async markLeadLost(paymentId: string): Promise<RecoveryLeadRecord | undefined> {
    return this.mutate((state) => {
      const lead = state.leads.find((item) => item.paymentId === paymentId);

      if (!lead) {
        return undefined;
      }

      lead.status = "LOST";
      lead.updatedAt = new Date().toISOString();
      return lead;
    });
  }

  async updateLeadStatus(input: {
    leadId: string;
    status: RecoveryLeadStatus;
  }): Promise<RecoveryLeadRecord | undefined> {
    return this.mutate((state) => {
      const lead = state.leads.find((item) => item.leadId === input.leadId);

      if (!lead) {
        return undefined;
      }

      lead.status = input.status;
      lead.updatedAt = new Date().toISOString();
      return lead;
    });
  }

  async createQueueJobs(jobs: QueueJobRecord[]): Promise<QueueJobRecord[]> {
    return this.mutate((state) => {
      state.queueJobs.unshift(...jobs);
      return jobs;
    });
  }

  async createPaymentAttempt(input: {
    paymentId: string;
    paymentLink: string;
    failureReason?: string;
  }): Promise<PaymentAttemptRecord> {
    return this.mutate((state) => {
      const attemptNumber =
        state.paymentAttempts.filter((attempt) => attempt.paymentId === input.paymentId).length +
        1;

      const attempt: PaymentAttemptRecord = {
        id: randomUUID(),
        paymentId: input.paymentId,
        attemptNumber,
        status: "retry_generated",
        failureReason: input.failureReason,
        paymentLink: input.paymentLink,
        createdAt: new Date().toISOString(),
      };

      state.paymentAttempts.unshift(attempt);
      return attempt;
    });
  }

  async upsertConversation(input: {
    channel: MessagingChannel;
    contactValue: string;
    customerName: string;
    lead?: RecoveryLeadRecord;
    customerId?: string;
  }): Promise<ConversationRecord> {
    return this.mutate((state) => {
      const timestamp = new Date().toISOString();
      const normalizedContact = normalizeContactValue(input.channel, input.contactValue);
      const existing =
        state.conversations.find(
          (conversation) =>
            conversation.channel === input.channel &&
            normalizeContactValue(conversation.channel, conversation.contactValue) ===
              normalizedContact,
        ) ?? null;

      if (existing) {
        existing.customerName = input.customerName || existing.customerName;
        existing.leadRecordId = input.lead?.id ?? existing.leadRecordId;
        existing.leadId = input.lead?.leadId ?? existing.leadId;
        existing.customerId = input.customerId ?? input.lead?.customerId ?? existing.customerId;
        existing.assignedAgentId = input.lead?.assignedAgentId ?? existing.assignedAgentId;
        existing.assignedAgentName = input.lead?.assignedAgentName ?? existing.assignedAgentName;
        existing.status = existing.status === "closed" ? "open" : existing.status;
        existing.updatedAt = timestamp;
        return existing;
      }

      const conversation: ConversationRecord = {
        id: randomUUID(),
        leadRecordId: input.lead?.id,
        leadId: input.lead?.leadId,
        customerId: input.customerId ?? input.lead?.customerId,
        customerName: input.customerName,
        channel: input.channel,
        contactValue: normalizedContact,
        assignedAgentId: input.lead?.assignedAgentId,
        assignedAgentName: input.lead?.assignedAgentName,
        status: "open",
        lastMessageAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.conversations.unshift(conversation);
      return conversation;
    });
  }

  async findConversationById(
    conversationId: string,
  ): Promise<ConversationRecord | undefined> {
    return this.readState().conversations.find((item) => item.id === conversationId);
  }

  async updateConversationStatus(input: {
    conversationId: string;
    status: ConversationStatus;
  }): Promise<ConversationRecord | undefined> {
    return this.mutate((state) => {
      const conversation = state.conversations.find(
        (item) => item.id === input.conversationId,
      );

      if (!conversation) {
        return undefined;
      }

      conversation.status = input.status;
      conversation.updatedAt = new Date().toISOString();
      return conversation;
    });
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
    return this.mutate((state) => {
      const timestamp = new Date().toISOString();
      const message: MessageRecord = {
        id: randomUUID(),
        conversationId: input.conversationId,
        leadRecordId: input.lead?.id,
        leadId: input.lead?.leadId,
        customerId: input.customerId ?? input.lead?.customerId,
        channel: input.channel,
        direction: input.direction,
        senderName: input.senderName,
        senderAddress: input.senderAddress,
        content: input.content,
        providerMessageId: input.providerMessageId,
        status: input.status,
        createdAt: timestamp,
        deliveredAt: input.deliveredAt,
        readAt: input.readAt,
        error: input.error,
        metadata: input.metadata,
      };

      state.messages.unshift(message);

      const conversation = state.conversations.find(
        (item) => item.id === input.conversationId,
      );

      if (conversation) {
        conversation.lastMessageAt = timestamp;
        conversation.updatedAt = timestamp;
        conversation.status = input.direction === "inbound" ? "open" : conversation.status;
      }

      return message;
    });
  }

  async updateMessageStatus(input: {
    providerMessageId: string;
    status: MessageStatus;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
  }): Promise<MessageRecord | undefined> {
    return this.mutate((state) => {
      const message = state.messages.find(
        (item) => item.providerMessageId === input.providerMessageId,
      );

      if (!message) {
        return undefined;
      }

      message.status = input.status;
      message.deliveredAt = input.deliveredAt ?? message.deliveredAt;
      message.readAt = input.readAt ?? message.readAt;
      message.error = input.error ?? message.error;

      const conversation = state.conversations.find(
        (item) => item.id === message.conversationId,
      );

      if (conversation) {
        conversation.updatedAt = new Date().toISOString();
      }

      return message;
    });
  }

  async addLog(log: SystemLogRecord): Promise<void> {
    this.mutate((state) => {
      state.logs.unshift(log);
    });
  }

  async getAnalytics(): Promise<RecoveryAnalytics> {
    const state = this.readState();
    const failedPayments = state.payments.filter((payment) => payment.firstFailureAt);
    const recoveredPayments = state.payments.filter(
      (payment) => payment.firstFailureAt && payment.recoveredAt,
    );

    const recoveredRevenue = recoveredPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const totalRecoveryHours = recoveredPayments.reduce((sum, payment) => {
      if (!payment.firstFailureAt || !payment.recoveredAt) {
        return sum;
      }

      const diffMs =
        new Date(payment.recoveredAt).getTime() -
        new Date(payment.firstFailureAt).getTime();
      return sum + diffMs / 3_600_000;
    }, 0);

    return {
      total_failed_payments: failedPayments.length,
      recovered_payments: recoveredPayments.length,
      recovery_rate: failedPayments.length
        ? Number(((recoveredPayments.length / failedPayments.length) * 100).toFixed(2))
        : 0,
      recovered_revenue: Number(recoveredRevenue.toFixed(2)),
      average_recovery_time_hours: recoveredPayments.length
        ? Number((totalRecoveryHours / recoveredPayments.length).toFixed(2))
        : 0,
      active_recoveries: state.leads.filter(
        (lead) => lead.status !== "RECOVERED" && lead.status !== "LOST",
      ).length,
    };
  }

  async getFollowUpContacts(): Promise<FollowUpContact[]> {
    const state = this.readState();

    return state.leads
      .map((lead) => {
        const payment = state.payments.find((item) => item.id === lead.paymentId);

        return {
          lead_id: lead.leadId,
          customer_name: lead.customerName,
          email: lead.email,
          phone: lead.phone,
          product: lead.product,
          payment_value: lead.paymentValue,
          payment_status: payment?.status ?? "unknown",
          payment_method: payment?.paymentMethod ?? "unknown",
          lead_status: lead.status,
          order_id: payment?.orderId ?? "unknown",
          gateway_payment_id: payment?.gatewayPaymentId ?? "unknown",
          assigned_agent: lead.assignedAgentName,
          created_at: lead.createdAt,
          updated_at: lead.updatedAt,
        };
      });
  }

  async getInboxConversations(): Promise<InboxConversation[]> {
    const state = this.readState();

    return state.conversations
      .map((conversation) => {
        const relatedMessages = state.messages
          .filter((message) => message.conversationId === conversation.id)
          .sort((left, right) => {
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
          });
        const lastMessage = relatedMessages[0];
        const unreadCount = relatedMessages.filter(
          (message) =>
            message.direction === "inbound" &&
            message.status !== "read" &&
            message.status !== "failed",
        ).length;

        return {
          conversation_id: conversation.id,
          lead_id: conversation.leadId,
          customer_name: conversation.customerName,
          channel: conversation.channel,
          contact_value: conversation.contactValue,
          assigned_agent: conversation.assignedAgentName,
          status: conversation.status,
          last_message_preview: lastMessage?.content ?? "Sem mensagens ainda.",
          last_message_at: lastMessage?.createdAt ?? conversation.lastMessageAt,
          unread_count: unreadCount,
          message_count: relatedMessages.length,
        };
      })
      .sort((left, right) => {
        return (
          new Date(right.last_message_at).getTime() -
          new Date(left.last_message_at).getTime()
        );
      });
  }

  async getConversationMessages(conversationId: string): Promise<MessageRecord[]> {
    return this.readState().messages
      .filter((message) => message.conversationId === conversationId)
      .sort((left, right) => {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      });
  }

  async getConnectionSettings(): Promise<ConnectionSettingsRecord> {
    return {
      ...createDefaultConnectionSettings(),
      ...this.readState().connectionSettings,
    };
  }

  async saveConnectionSettings(
    input: ConnectionSettingsInput,
  ): Promise<ConnectionSettingsRecord> {
    return this.mutate((state) => {
      const defaults = createDefaultConnectionSettings();
      const definedInput = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      ) as ConnectionSettingsInput;
      const nextSettings: ConnectionSettingsRecord = {
        ...defaults,
        ...state.connectionSettings,
        ...definedInput,
        webhookToleranceSeconds:
          input.webhookToleranceSeconds ??
          state.connectionSettings.webhookToleranceSeconds ??
          defaults.webhookToleranceSeconds,
        updatedAt: new Date().toISOString(),
      };

      state.connectionSettings = nextSettings;
      return nextSettings;
    });
  }

  getWebhookUrl(): string {
    return `${appEnv.appBaseUrl}/api/webhooks/shield-gateway`;
  }
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



declare global {
  var __shieldRecoveryStorage__: RecoveryStorage | undefined;
}

export function getStorageService(): RecoveryStorage {
  const database = getPlatformBootstrapService().getResolvedDatabaseSettings();
  const hasConnectionSettingsApi =
    globalThis.__shieldRecoveryStorage__ &&
    typeof globalThis.__shieldRecoveryStorage__.getConnectionSettings === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.saveConnectionSettings === "function";
  const shouldUseSupabase = database.databaseConfigured;
  const currentMode = globalThis.__shieldRecoveryStorage__?.mode;

  if (
    !globalThis.__shieldRecoveryStorage__ ||
    !hasConnectionSettingsApi ||
    (shouldUseSupabase && currentMode !== "supabase") ||
    (!shouldUseSupabase && currentMode !== "local_json")
  ) {
    globalThis.__shieldRecoveryStorage__ = shouldUseSupabase
      ? new SupabaseStorageService({
          supabaseUrl: database.supabaseUrl,
          supabaseServiceRoleKey: database.supabaseServiceRoleKey,
        })
      : new LocalStorageService();
  }

  return globalThis.__shieldRecoveryStorage__;
}
