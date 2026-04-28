import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { buildGatewayWebhookPath, platformBrand } from "@/lib/platform";
import { appEnv } from "@/server/recovery/config";
import { createDefaultConnectionSettings } from "@/server/recovery/config";
import type {
  AffiliateLinkInput,
  AffiliateLinkRecord,
  AffiliateReferralRecord,
  AffiliateStats,
  AgentRecord,
  CalendarSnapshot,
  CalendarNoteRecord,
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
  StorageState,
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
    source?: string;
    payload: unknown;
  }): Promise<WebhookEventRecord>;
  listWebhookEvents(limit?: number): Promise<WebhookEventRecord[]>;
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
  findLeadByLeadId(leadId: string): Promise<RecoveryLeadRecord | undefined>;
  findLeadByContact(input: {
    phone?: string;
    email?: string;
  }): Promise<RecoveryLeadRecord | undefined>;
  ensureAgent(input: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<AgentRecord>;
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
    assignedAgent?: AgentRecord;
  }): Promise<RecoveryLeadRecord | undefined>;
  createQueueJobs(jobs: QueueJobRecord[]): Promise<QueueJobRecord[]>;
  getQueueOverview(): Promise<QueueOverviewSnapshot>;
  claimDueQueueJobs(input?: {
    limit?: number;
    runUntil?: string;
  }): Promise<QueueJobRecord[]>;
  completeQueueJob(jobId: string): Promise<void>;
  rescheduleQueueJobFailure(input: {
    jobId: string;
    error: string;
    remainingAttempts: number;
    nextRunAt?: string;
  }): Promise<QueueJobRecord | undefined>;
  hasScheduledJobsForLead(leadId: string, jobType: string): Promise<boolean>;
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
  updateMessageById(input: {
    messageId: string;
    status: MessageStatus;
    providerMessageId?: string;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
  }): Promise<MessageRecord | undefined>;
  updateMessageStatus(input: {
    providerMessageId: string;
    status: MessageStatus;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
  }): Promise<MessageRecord | undefined>;
  addLog(log: SystemLogRecord): Promise<void>;
  getCalendarSnapshot(input: {
    month: string;
    visibleLeadIds?: string[];
  }): Promise<CalendarSnapshot>;
  createCalendarNote(input: CreateCalendarNoteInput): Promise<CalendarNoteRecord>;
  deleteCalendarNote(noteId: string): Promise<void>;
  getAnalytics(agentName?: string): Promise<RecoveryAnalytics>;
  listQueueJobs(limit?: number): Promise<QueueJobRecord[]>;
  listSystemLogs(limit?: number): Promise<SystemLogRecord[]>;
  getFollowUpContacts(agentName?: string): Promise<FollowUpContact[]>;
  getInboxConversations(agentName?: string): Promise<InboxConversation[]>;
  getConversationMessages(conversationId: string): Promise<MessageRecord[]>;
  getSellerAdminControls(): Promise<SellerAdminControlRecord[]>;
  saveSellerAdminControl(
    input: SellerAdminControlInput,
  ): Promise<SellerAdminControlRecord>;
  listSellerUsers(): Promise<SellerUserRecord[]>;
  findSellerUserByEmail(email: string): Promise<SellerUserRecord | undefined>;
  saveSellerUser(input: SellerUserInput): Promise<SellerUserRecord>;
  touchSellerUserLogin(email: string): Promise<void>;
  listSellerInvites(): Promise<SellerInviteRecord[]>;
  findSellerInviteByToken(token: string): Promise<SellerInviteRecord | undefined>;
  createSellerInvite(input: SellerInviteInput): Promise<SellerInviteRecord>;
  markSellerInviteAccepted(token: string): Promise<SellerInviteRecord | undefined>;

  /* Affiliates */
  createAffiliateLink(input: AffiliateLinkInput): Promise<AffiliateLinkRecord>;
  listAffiliateLinks(sellerKey: string): Promise<AffiliateLinkRecord[]>;
  getAffiliateLinkByCode(code: string): Promise<AffiliateLinkRecord | undefined>;
  deactivateAffiliateLink(linkId: string): Promise<void>;
  incrementAffiliateLinkClicks(code: string): Promise<void>;
  listAffiliateReferrals(sellerKey: string): Promise<AffiliateReferralRecord[]>;
  getAffiliateStats(sellerKey: string): Promise<AffiliateStats>;

  getConnectionSettings(): Promise<ConnectionSettingsRecord>;
  saveConnectionSettings(
    input: ConnectionSettingsInput,
  ): Promise<ConnectionSettingsRecord>;
  getWebhookUrl(): string;

  /* CallCenter */
  listCalls(options?: {
    leadId?: string;
    customerId?: string;
    campaignId?: string;
    status?: string;
    sellerKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CallRecord[]>;
  getCall(callId: string): Promise<CallRecord | undefined>;
  getCallByProviderCallId(providerCallId: string): Promise<CallRecord | undefined>;
  createCall(input: CreateCallInput): Promise<CallRecord>;
  updateCall(callId: string, input: UpdateCallInput): Promise<CallRecord>;
  createCallEvent(callId: string, eventType: string, eventData?: Record<string, unknown>): Promise<void>;
  getCallEvents(callId: string): Promise<CallEventRecord[]>;
  getCallAnalytics(): Promise<CallAnalytics>;
  listCallCampaigns(): Promise<CallCampaignRecord[]>;
  createCallCampaign(input: {
    name: string;
    description?: string;
    filterCriteria?: Record<string, unknown>;
    createdBy?: string;
  }): Promise<CallCampaignRecord>;
  updateCallCampaign(
    campaignId: string,
    input: Partial<{ name: string; description: string; status: string; totalContacts: number; completedContacts: number; successfulContacts: number; startedAt: string; completedAt: string }>,
  ): Promise<CallCampaignRecord>;
  getCallcenterSettings(sellerKey: string): Promise<CallcenterSettingsRecord | undefined>;
  listCallcenterSettings(): Promise<CallcenterSettingsRecord[]>;
  upsertCallcenterSettings(input: CallcenterSettingsInput): Promise<CallcenterSettingsRecord>;

  /* Quiz leads */
  listQuizLeads(): Promise<QuizLeadRecord[]>;
  createQuizLead(input: { email: string; answers: string[] }): Promise<QuizLeadRecord>;
  updateQuizLead(id: string, input: { status?: string; whatsappSentAt?: string; notes?: string }): Promise<QuizLeadRecord | undefined>;

  /* Demo Call Leads */
  findDemoCallLeadByPhone(phone: string): Promise<DemoCallLeadRecord | undefined>;
  createDemoCallLead(input: { name: string; phone: string }): Promise<DemoCallLeadRecord>;
  updateDemoCallLead(id: string, input: { status?: string; calledAt?: string; vapiCallId?: string }): Promise<DemoCallLeadRecord | undefined>;
  deleteDemoCallLeadByPhone(phone: string): Promise<void>;
  listDemoCallLeads(): Promise<DemoCallLeadRecord[]>;

  /* Whitelabel */
  listWhitelabelProfiles(): Promise<WhitelabelProfileRecord[]>;
  getWhitelabelProfile(id: string): Promise<WhitelabelProfileRecord | undefined>;
  saveWhitelabelProfile(input: WhitelabelProfileInput, id?: string): Promise<WhitelabelProfileRecord>;
  deleteWhitelabelProfile(id: string): Promise<void>;

  /* Opt-out / Blacklist */
  createOptOut(input: OptOutInput): Promise<OptOutRecord>;
  removeOptOut(channel: string, contactValue: string): Promise<void>;
  isOptedOut(channel: string, contactValue: string): Promise<boolean>;
  listOptOuts(options?: { contactValue?: string; channel?: string; limit?: number }): Promise<OptOutRecord[]>;

  /* Frequency Capping */
  logContactFrequency(input: FrequencyLogInput): Promise<FrequencyLogRecord>;
  checkFrequencyLimit(contactValue: string, sellerKey?: string): Promise<FrequencyCheck>;
  getContactFrequencyLog(contactValue: string, options?: { since?: string; channel?: string; limit?: number }): Promise<FrequencyLogRecord[]>;

  /* Message Templates */
  listMessageTemplates(options?: { category?: string; vertical?: string; channel?: string; sellerKey?: string; active?: boolean }): Promise<MessageTemplateRecord[]>;
  getMessageTemplate(idOrSlug: string): Promise<MessageTemplateRecord | undefined>;
  createMessageTemplate(input: MessageTemplateInput): Promise<MessageTemplateRecord>;
  updateMessageTemplate(id: string, input: Partial<MessageTemplateInput>): Promise<MessageTemplateRecord>;
  incrementTemplateUsage(id: string, converted?: boolean): Promise<void>;

  /* A/B Testing */
  createABTest(input: ABTestInput): Promise<ABTestRecord>;
  getABTest(id: string): Promise<ABTestRecord | undefined>;
  listABTests(options?: { status?: string; sellerKey?: string }): Promise<ABTestRecord[]>;
  updateABTest(id: string, input: Partial<ABTestRecord>): Promise<ABTestRecord>;
  createABTestAssignment(input: { abTestId: string; contactValue: string; variant: "a" | "b"; messageId?: string }): Promise<ABTestAssignmentRecord>;
  getABTestAssignment(abTestId: string, contactValue: string): Promise<ABTestAssignmentRecord | undefined>;
  updateABTestAssignment(id: string, input: Partial<{ delivered: boolean; clicked: boolean; converted: boolean }>): Promise<void>;

  /* Recovery Funnel */
  upsertFunnelSnapshot(input: Omit<RecoveryFunnelSnapshot, "id" | "createdAt">): Promise<RecoveryFunnelSnapshot>;
  getFunnelSnapshots(options: { startDate: string; endDate: string; sellerKey?: string; channel?: string }): Promise<RecoveryFunnelSnapshot[]>;
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
    calendarNotes: [],
    sellerAdminControls: [],
    sellerUsers: [],
    sellerInvites: [],
    quizLeads: [],
    demoCallLeads: [],
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
    calendarNotes: partial.calendarNotes ?? baseState.calendarNotes,
    sellerAdminControls: partial.sellerAdminControls ?? baseState.sellerAdminControls,
    sellerUsers: partial.sellerUsers ?? baseState.sellerUsers,
    sellerInvites: partial.sellerInvites ?? baseState.sellerInvites,
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
    calendarNotes: state.calendarNotes,
    sellerAdminControls: state.sellerAdminControls,
    sellerUsers: state.sellerUsers
      .filter((seller) => Boolean(seller.email))
      .sort((left, right) => left.displayName.localeCompare(right.displayName)),
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
        (agent) => !agent.email.endsWith("@pagrecovery.local"),
      );
      state.leads = [];
      state.queueJobs = [];
      state.conversations = [];
      state.messages = [];
      state.logs = [];
      state.calendarNotes = [];
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
    source?: string;
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
        source: input.source ?? platformBrand.gateway.slug,
        createdAt: new Date().toISOString(),
      };

      state.webhookEvents.unshift(record);
      return record;
    });
  }

  async listWebhookEvents(limit = 100): Promise<WebhookEventRecord[]> {
    return this.readState().webhookEvents.slice(0, limit);
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
      const normalizedPhone = normalizePhone(normalizedEvent.customer.phone);
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
        existing.phone = normalizedPhone;
        existing.updatedAt = timestamp;
        return existing;
      }

      const customer: CustomerRecord = {
        id: randomUUID(),
        gatewayCustomerId: normalizedEvent.customer.id,
        name: normalizedEvent.customer.name,
        email: normalizedEvent.customer.email,
        phone: normalizedPhone,
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

  async findLeadByLeadId(leadId: string): Promise<RecoveryLeadRecord | undefined> {
    return this.readState().leads.find((lead) => lead.leadId === leadId);
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

  async ensureAgent(input: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<AgentRecord> {
    return this.mutate((state) => {
      const normalizedPhone = normalizePhone(input.phone);
      const existing =
        state.agents.find(
          (agent) => agent.email.trim().toLowerCase() === input.email.trim().toLowerCase(),
        ) ??
        state.agents.find(
          (agent) => agent.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
        );

      if (existing) {
        existing.name = input.name;
        existing.email = input.email;
        existing.phone = normalizedPhone || existing.phone;
        existing.active = true;
        return existing;
      }

      const agent: AgentRecord = {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        phone: normalizedPhone,
        active: true,
        createdAt: new Date().toISOString(),
      };

      state.agents.push(agent);
      return agent;
    });
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
      const normalizedPhone = normalizePhone(input.customer.phone);
      const existing =
        state.leads.find((lead) => lead.paymentId === input.payment.id) ?? null;

      if (existing) {
        existing.customerName = input.customer.name;
        existing.email = input.customer.email;
        existing.phone = normalizedPhone;
        existing.paymentValue = input.payment.amount;
        existing.product = input.product;
        existing.failureReason = input.failureReason;
        existing.status =
          existing.status === "RECOVERED" || existing.status === "CONTACTING"
            ? existing.status
            : input.status;
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
        phone: normalizedPhone,
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
    assignedAgent?: AgentRecord;
  }): Promise<RecoveryLeadRecord | undefined> {
    return this.mutate((state) => {
      const lead = state.leads.find((item) => item.leadId === input.leadId);

      if (!lead) {
        return undefined;
      }

      lead.status = input.status;
      if (input.assignedAgent) {
        lead.assignedAgentId = input.assignedAgent.id;
        lead.assignedAgentName = input.assignedAgent.name;
      }
      lead.updatedAt = new Date().toISOString();

      state.conversations
        .filter((conversation) => conversation.leadId === lead.leadId)
        .forEach((conversation) => {
          conversation.assignedAgentId = lead.assignedAgentId;
          conversation.assignedAgentName = lead.assignedAgentName;
          conversation.updatedAt = lead.updatedAt;
        });

      return lead;
    });
  }

  async createQueueJobs(jobs: QueueJobRecord[]): Promise<QueueJobRecord[]> {
    return this.mutate((state) => {
      state.queueJobs.unshift(...jobs);
      return jobs;
    });
  }

  async getQueueOverview(): Promise<QueueOverviewSnapshot> {
    const now = Date.now();
    const queueJobs = this.readState().queueJobs.map((job) => ({ ...job }));
    const scheduledJobs = queueJobs
      .filter((job) => job.status === "scheduled")
      .sort((left, right) => new Date(left.runAt).getTime() - new Date(right.runAt).getTime());
    const dueJobs = scheduledJobs.filter(
      (job) => new Date(job.runAt).getTime() <= now,
    );

    return {
      scheduled: scheduledJobs.length,
      processing: queueJobs.filter((job) => job.status === "processing").length,
      processed: queueJobs.filter((job) => job.status === "processed").length,
      failed: queueJobs.filter((job) => job.status === "failed").length,
      dueNow: dueJobs.length,
      oldestScheduledAt: scheduledJobs[0]?.runAt,
      oldestDueAt: dueJobs[0]?.runAt,
    };
  }

  async claimDueQueueJobs(input?: {
    limit?: number;
    runUntil?: string;
  }): Promise<QueueJobRecord[]> {
    const limit = input?.limit ?? 20;
    const runUntil = new Date(input?.runUntil ?? new Date().toISOString()).getTime();

    return this.mutate((state) => {
      const dueJobs = state.queueJobs
        .filter((job) => job.status === "scheduled")
        .filter((job) => new Date(job.runAt).getTime() <= runUntil)
        .sort((left, right) => {
          const priorityDifference =
            queueJobPriority(left.jobType) - queueJobPriority(right.jobType);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return new Date(left.runAt).getTime() - new Date(right.runAt).getTime();
        })
        .slice(0, limit);

      dueJobs.forEach((job) => {
        job.status = "processing";
        job.error = undefined;
      });

      return dueJobs.map((job) => ({ ...job }));
    });
  }

  async completeQueueJob(jobId: string): Promise<void> {
    this.mutate((state) => {
      const job = state.queueJobs.find((item) => item.id === jobId);

      if (!job) {
        return;
      }

      job.status = "processed";
      job.error = undefined;
    });
  }

  async rescheduleQueueJobFailure(input: {
    jobId: string;
    error: string;
    remainingAttempts: number;
    nextRunAt?: string;
  }): Promise<QueueJobRecord | undefined> {
    return this.mutate((state) => {
      const job = state.queueJobs.find((item) => item.id === input.jobId);

      if (!job) {
        return undefined;
      }

      job.attempts = Math.max(0, input.remainingAttempts);
      job.error = input.error;

      if (input.remainingAttempts > 0 && input.nextRunAt) {
        job.status = "scheduled";
        job.runAt = input.nextRunAt;
      } else {
        job.status = "failed";
      }

      return { ...job };
    });
  }

  async hasScheduledJobsForLead(leadId: string, jobType: string): Promise<boolean> {
    const state = this.readState();
    return state.queueJobs.some(
      (job: QueueJobRecord) =>
        job.jobType === jobType &&
        (job.status === "scheduled" || job.status === "processing") &&
        (job.payload as Record<string, unknown>)?.leadId === leadId,
    );
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

  async updateMessageById(input: {
    messageId: string;
    status: MessageStatus;
    providerMessageId?: string;
    deliveredAt?: string;
    readAt?: string;
    error?: string;
  }): Promise<MessageRecord | undefined> {
    return this.mutate((state) => {
      const message = state.messages.find((item) => item.id === input.messageId);

      if (!message) {
        return undefined;
      }

      message.status = input.status;
      message.providerMessageId = input.providerMessageId ?? message.providerMessageId;
      message.deliveredAt = input.deliveredAt ?? message.deliveredAt;
      message.readAt = input.readAt ?? message.readAt;
      message.error = input.error ?? message.error;

      return { ...message };
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

  async getCalendarSnapshot(input: {
    month: string;
    visibleLeadIds?: string[];
  }): Promise<CalendarSnapshot> {
    const state = this.readState();

    return buildCalendarSnapshot({
      month: input.month,
      visibleLeadIds: input.visibleLeadIds,
      leads: state.leads,
      payments: state.payments,
      queueJobs: state.queueJobs,
      messages: state.messages,
      conversations: state.conversations,
      calendarNotes: state.calendarNotes,
    });
  }

  async createCalendarNote(
    input: CreateCalendarNoteInput,
  ): Promise<CalendarNoteRecord> {
    return this.mutate((state) => {
      const timestamp = new Date().toISOString();
      const note: CalendarNoteRecord = {
        id: randomUUID(),
        date: normalizeCalendarDate(input.date),
        lane: input.lane,
        title: input.title.trim(),
        content: input.content?.trim() || undefined,
        createdByEmail: input.createdByEmail.trim().toLowerCase(),
        createdByRole: input.createdByRole,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.calendarNotes.unshift(note);
      return note;
    });
  }

  async deleteCalendarNote(noteId: string): Promise<void> {
    this.mutate((state) => {
      state.calendarNotes = state.calendarNotes.filter((note) => note.id !== noteId);
    });
  }

  async getAnalytics(agentName?: string): Promise<RecoveryAnalytics> {
    const state = this.readState();

    // When scoped to a seller, only count their leads/payments
    const scopedLeads = agentName
      ? state.leads.filter(
          (lead) =>
            lead.assignedAgentName?.toLowerCase() === agentName.toLowerCase(),
        )
      : state.leads;
    const scopedPaymentIds = new Set(scopedLeads.map((l) => l.paymentId));
    const scopedPayments = agentName
      ? state.payments.filter((p) => scopedPaymentIds.has(p.id))
      : state.payments;

    const failedPayments = scopedPayments.filter((payment) => payment.firstFailureAt);
    const recoveredPayments = scopedPayments.filter(
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
      active_recoveries: scopedLeads.filter(
        (lead) => lead.status !== "RECOVERED" && lead.status !== "LOST",
      ).length,
    };
  }

  async listQueueJobs(limit = 50): Promise<QueueJobRecord[]> {
    return this.readState().queueJobs
      .map((job) => ({ ...job }))
      .sort(
        (left, right) =>
          new Date(right.runAt).getTime() - new Date(left.runAt).getTime(),
      )
      .slice(0, Math.max(1, limit));
  }

  async listSystemLogs(limit = 50): Promise<SystemLogRecord[]> {
    return this.readState().logs
      .map((log) => ({ ...log }))
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, Math.max(1, limit));
  }

  async getFollowUpContacts(agentName?: string): Promise<FollowUpContact[]> {
    const state = this.readState();

    const leads = agentName
      ? state.leads.filter(
          (lead) =>
            lead.assignedAgentName?.toLowerCase() === agentName.toLowerCase(),
        )
      : state.leads;

    return leads
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

  async getInboxConversations(agentName?: string): Promise<InboxConversation[]> {
    const state = this.readState();

    const filteredConversations = agentName
      ? state.conversations.filter(
          (conversation) =>
            conversation.assignedAgentName?.toLowerCase() === agentName.toLowerCase(),
        )
      : state.conversations;

    return filteredConversations
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

  async getSellerAdminControls(): Promise<SellerAdminControlRecord[]> {
    return this.readState().sellerAdminControls
      .map((control) => ({ ...control }))
      .sort((left, right) => left.sellerName.localeCompare(right.sellerName));
  }

  async listSellerUsers(): Promise<SellerUserRecord[]> {
    return this.readState().sellerUsers
      .map((seller) => ({ ...seller }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  async findSellerUserByEmail(email: string): Promise<SellerUserRecord | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const seller = this.readState().sellerUsers.find(
      (item) => item.email.trim().toLowerCase() === normalizedEmail,
    );

    return seller ? { ...seller } : undefined;
  }

  async saveSellerUser(input: SellerUserInput): Promise<SellerUserRecord> {
    return this.mutate((state) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existing = state.sellerUsers.find(
        (seller) => seller.email.trim().toLowerCase() === normalizedEmail,
      );
      const timestamp = new Date().toISOString();

      const nextRecord: SellerUserRecord = {
        id: existing?.id ?? randomUUID(),
        email: normalizedEmail,
        displayName:
          input.displayName?.trim() || existing?.displayName || normalizedEmail,
        agentName: input.agentName.trim() || existing?.agentName || normalizedEmail,
        passwordHash: input.passwordHash ?? existing?.passwordHash ?? "",
        active: input.active ?? existing?.active ?? true,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        lastLoginAt: existing?.lastLoginAt,
      };

      if (existing) {
        Object.assign(existing, nextRecord);
        return existing;
      }

      state.sellerUsers.unshift(nextRecord);
      return nextRecord;
    });
  }

  async touchSellerUserLogin(email: string): Promise<void> {
    await this.mutate((state) => {
      const normalizedEmail = email.trim().toLowerCase();
      const seller = state.sellerUsers.find(
        (item) => item.email.trim().toLowerCase() === normalizedEmail,
      );

      if (seller) {
        seller.lastLoginAt = new Date().toISOString();
        seller.updatedAt = new Date().toISOString();
      }
    });
  }

  async listSellerInvites(): Promise<SellerInviteRecord[]> {
    return this.readState().sellerInvites
      .map((invite) => ({ ...invite }))
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
  }

  async findSellerInviteByToken(token: string): Promise<SellerInviteRecord | undefined> {
    const normalizedToken = token.trim();
    const invite = this.readState().sellerInvites.find(
      (item) => item.token === normalizedToken,
    );
    return invite ? { ...invite } : undefined;
  }

  async createSellerInvite(input: SellerInviteInput): Promise<SellerInviteRecord> {
    return this.mutate((state) => {
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + Math.max(1, input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000,
      );
      const record: SellerInviteRecord = {
        id: randomUUID(),
        token: randomUUID(),
        email: input.email.trim().toLowerCase(),
        suggestedDisplayName: input.suggestedDisplayName?.trim() || undefined,
        agentName: input.agentName?.trim() || undefined,
        note: input.note?.trim() || undefined,
        createdByEmail: input.createdByEmail.trim().toLowerCase(),
        status: "pending",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      state.sellerInvites.unshift(record);
      return record;
    });
  }

  async markSellerInviteAccepted(token: string): Promise<SellerInviteRecord | undefined> {
    return this.mutate((state) => {
      const invite = state.sellerInvites.find((item) => item.token === token.trim());
      if (!invite) {
        return undefined;
      }

      const now = new Date().toISOString();
      invite.status = "accepted";
      invite.acceptedAt = now;
      invite.updatedAt = now;
      return { ...invite };
    });
  }

  /* ── Affiliates (local JSON fallback) ── */

  private getAffiliateLinks(): AffiliateLinkRecord[] {
    const state = this.readState();
    return (state as StorageState & { affiliateLinks?: AffiliateLinkRecord[] }).affiliateLinks ?? [];
  }

  private getAffiliateReferrals(): AffiliateReferralRecord[] {
    const state = this.readState();
    return (state as StorageState & { affiliateReferrals?: AffiliateReferralRecord[] }).affiliateReferrals ?? [];
  }

  async createAffiliateLink(input: AffiliateLinkInput): Promise<AffiliateLinkRecord> {
    const now = new Date().toISOString();
    const code = randomUUID().replace(/-/g, "").slice(0, 12);
    const record: AffiliateLinkRecord = {
      id: randomUUID(),
      sellerKey: input.sellerKey,
      sellerEmail: input.sellerEmail,
      code,
      label: input.label,
      commissionPct: input.commissionPct ?? 5,
      clicks: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.mutate((state) => {
      const ext = state as StorageState & { affiliateLinks?: AffiliateLinkRecord[] };
      if (!ext.affiliateLinks) ext.affiliateLinks = [];
      ext.affiliateLinks.push(record);
    });
    return record;
  }

  async listAffiliateLinks(sellerKey: string): Promise<AffiliateLinkRecord[]> {
    return this.getAffiliateLinks()
      .filter((link) => link.sellerKey === sellerKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAffiliateLinkByCode(code: string): Promise<AffiliateLinkRecord | undefined> {
    return this.getAffiliateLinks().find((link) => link.code === code);
  }

  async deactivateAffiliateLink(linkId: string): Promise<void> {
    this.mutate((state) => {
      const ext = state as StorageState & { affiliateLinks?: AffiliateLinkRecord[] };
      const link = ext.affiliateLinks?.find((l) => l.id === linkId);
      if (link) {
        link.active = false;
        link.updatedAt = new Date().toISOString();
      }
    });
  }

  async incrementAffiliateLinkClicks(code: string): Promise<void> {
    this.mutate((state) => {
      const ext = state as StorageState & { affiliateLinks?: AffiliateLinkRecord[] };
      const link = ext.affiliateLinks?.find((l) => l.code === code);
      if (link) {
        link.clicks += 1;
      }
    });
  }

  async listAffiliateReferrals(sellerKey: string): Promise<AffiliateReferralRecord[]> {
    return this.getAffiliateReferrals()
      .filter((r) => r.referrerSellerKey === sellerKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAffiliateStats(sellerKey: string): Promise<AffiliateStats> {
    const links = this.getAffiliateLinks().filter((l) => l.sellerKey === sellerKey);
    const referrals = this.getAffiliateReferrals().filter((r) => r.referrerSellerKey === sellerKey);
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
    return this.mutate((state) => {
      const sellerKey = normalizeSellerKey(input.sellerKey);
      const existing = state.sellerAdminControls.find(
        (control) => control.sellerKey === sellerKey,
      );
      const timestamp = new Date().toISOString();

      const nextRecord: SellerAdminControlRecord = {
        id: existing?.id ?? randomUUID(),
        sellerKey,
        sellerName: input.sellerName?.trim() || existing?.sellerName || input.sellerKey,
        sellerEmail:
          input.sellerEmail?.trim().toLowerCase() ||
          existing?.sellerEmail ||
          undefined,
        active: input.active ?? existing?.active ?? true,
        recoveryTargetPercent: clampPercent(
          input.recoveryTargetPercent ?? existing?.recoveryTargetPercent ?? 18,
        ),
        reportedRecoveryRatePercent:
          input.reportedRecoveryRatePercent !== undefined
            ? clampOptionalPercent(input.reportedRecoveryRatePercent)
            : existing?.reportedRecoveryRatePercent,
        maxAssignedLeads: clampLeadLimit(
          input.maxAssignedLeads ?? existing?.maxAssignedLeads ?? 30,
        ),
        inboxEnabled: input.inboxEnabled ?? existing?.inboxEnabled ?? true,
        automationsEnabled:
          input.automationsEnabled ?? existing?.automationsEnabled ?? true,
        autonomyMode: input.autonomyMode ?? existing?.autonomyMode ?? "autonomous",
        messagingApproach: input.messagingApproach ?? existing?.messagingApproach ?? "friendly",
        gatewayApiKey:
          input.gatewayApiKey?.trim() || existing?.gatewayApiKey || undefined,
        whitelabelId:
          input.whitelabelId?.trim() || existing?.whitelabelId || undefined,
        notes: input.notes?.trim() || existing?.notes || undefined,
        whatsappInstanceName:
          input.whatsappInstanceName !== undefined
            ? (input.whatsappInstanceName || undefined)
            : existing?.whatsappInstanceName,
        whatsappInstanceStatus:
          input.whatsappInstanceStatus ?? existing?.whatsappInstanceStatus ?? "disconnected",
        whatsappInstanceQrCode:
          input.whatsappInstanceQrCode !== undefined
            ? (input.whatsappInstanceQrCode || undefined)
            : existing?.whatsappInstanceQrCode,
        whatsappInstancePhone:
          input.whatsappInstancePhone !== undefined
            ? (input.whatsappInstancePhone || undefined)
            : existing?.whatsappInstancePhone,
        whatsappInstanceError:
          input.whatsappInstanceError !== undefined
            ? (input.whatsappInstanceError || undefined)
            : existing?.whatsappInstanceError,
        whatsappInstanceUpdatedAt:
          input.whatsappInstanceUpdatedAt ?? existing?.whatsappInstanceUpdatedAt,
        updatedAt: timestamp,
      };

      if (existing) {
        Object.assign(existing, nextRecord);
        return existing;
      }

      state.sellerAdminControls.unshift(nextRecord);
      return nextRecord;
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
    return `${appEnv.appBaseUrl}${buildGatewayWebhookPath()}`;
  }

  /* CallCenter — stubs for local mode */

  async listCalls(): Promise<CallRecord[]> { return []; }
  async getCall(): Promise<CallRecord | undefined> { return undefined; }
  async getCallByProviderCallId(): Promise<CallRecord | undefined> { return undefined; }
  async createCall(input: CreateCallInput): Promise<CallRecord> {
    return {
      id: randomUUID(), campaignId: undefined, leadId: input.leadId, customerId: input.customerId,
      agentId: input.agentId, direction: input.direction ?? "outbound", fromNumber: input.fromNumber,
      toNumber: input.toNumber, status: "queued", durationSeconds: 0, ringDurationSeconds: 0,
      provider: input.provider ?? "vapi", providerCallId: input.providerCallId,
      metadata: input.metadata ?? {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
  async updateCall(_callId: string, _input: UpdateCallInput): Promise<CallRecord> {
    throw new Error("Local storage does not support call updates.");
  }
  async createCallEvent(): Promise<void> {}
  async getCallEvents(): Promise<CallEventRecord[]> { return []; }
  async getCallAnalytics(): Promise<CallAnalytics> {
    return { totalCalls: 0, completedCalls: 0, answeredCalls: 0, totalDurationSeconds: 0,
      averageDurationSeconds: 0, answerRate: 0, recoveredFromCalls: 0, callbacksScheduled: 0,
      byOutcome: {}, byStatus: {} };
  }
  async listCallCampaigns(): Promise<CallCampaignRecord[]> { return []; }
  async createCallCampaign(input: { name: string }): Promise<CallCampaignRecord> {
    return {
      id: randomUUID(), name: input.name, description: "", status: "draft",
      filterCriteria: {}, totalContacts: 0, completedContacts: 0, successfulContacts: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
  async updateCallCampaign(): Promise<CallCampaignRecord> {
    throw new Error("Local storage does not support campaign updates.");
  }
  async getCallcenterSettings(): Promise<CallcenterSettingsRecord | undefined> { return undefined; }
  async listCallcenterSettings(): Promise<CallcenterSettingsRecord[]> { return []; }
  async upsertCallcenterSettings(input: CallcenterSettingsInput): Promise<CallcenterSettingsRecord> {
    return {
      id: randomUUID(), sellerKey: input.sellerKey, voiceTone: input.voiceTone ?? "empathetic",
      voiceGender: input.voiceGender ?? "female", discountPercent: input.discountPercent ?? 0,
      couponCode: input.couponCode ?? "",
      defaultCopy: input.defaultCopy ?? "", defaultProduct: input.defaultProduct ?? "",
      provider: input.provider ?? "vapi", maxCallsPerDay: input.maxCallsPerDay ?? 50,
      autoCallEnabled: input.autoCallEnabled ?? false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }

  /* Whitelabel — stubs for local mode */

  async listWhitelabelProfiles(): Promise<WhitelabelProfileRecord[]> { return []; }
  async getWhitelabelProfile(): Promise<WhitelabelProfileRecord | undefined> { return undefined; }
  async saveWhitelabelProfile(input: WhitelabelProfileInput): Promise<WhitelabelProfileRecord> {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      name: input.name,
      slug: input.slug ?? input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      gatewayProvider: input.gatewayProvider,
      gatewayBaseUrl: input.gatewayBaseUrl ?? "",
      gatewayDocsUrl: input.gatewayDocsUrl ?? "",
      gatewayWebhookPath: input.gatewayWebhookPath ?? "",
      checkoutUrl: input.checkoutUrl ?? "",
      checkoutApiKey: input.checkoutApiKey ?? "",
      brandAccent: input.brandAccent ?? "",
      brandLogo: input.brandLogo ?? "",
      active: input.active ?? true,
      sellersCount: 0,
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    };
  }
  async deleteWhitelabelProfile(): Promise<void> {}

  /* Quiz leads */

  async listQuizLeads(): Promise<QuizLeadRecord[]> {
    return this.readState().quizLeads
      .map((lead) => ({ ...lead }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createQuizLead(input: { email: string; answers: string[] }): Promise<QuizLeadRecord> {
    return this.mutate((state) => {
      const email = input.email.trim().toLowerCase();
      const existing = state.quizLeads.find((l) => l.email === email);
      if (existing) return existing;

      const record: QuizLeadRecord = {
        id: randomUUID(),
        email,
        answers: input.answers,
        status: "new",
        createdAt: new Date().toISOString(),
      };
      state.quizLeads.push(record);
      return record;
    });
  }

  async updateQuizLead(
    id: string,
    input: { status?: string; whatsappSentAt?: string; notes?: string },
  ): Promise<QuizLeadRecord | undefined> {
    return this.mutate((state) => {
      const lead = state.quizLeads.find((l) => l.id === id);
      if (!lead) return undefined;
      if (input.status) lead.status = input.status as QuizLeadRecord["status"];
      if (input.whatsappSentAt) lead.whatsappSentAt = input.whatsappSentAt;
      if (input.notes !== undefined) lead.notes = input.notes;
      return { ...lead };
    });
  }

  /* Demo Call Leads */

  async findDemoCallLeadByPhone(phone: string): Promise<DemoCallLeadRecord | undefined> {
    return this.readState().demoCallLeads.find((l) => l.phone === phone.trim());
  }

  async createDemoCallLead(input: { name: string; phone: string }): Promise<DemoCallLeadRecord> {
    return this.mutate((state) => {
      const phone = input.phone.trim();
      const existing = state.demoCallLeads.find((l) => l.phone === phone);
      if (existing) return existing;

      const record: DemoCallLeadRecord = {
        id: randomUUID(),
        name: input.name.trim(),
        phone,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      state.demoCallLeads.push(record);
      return record;
    });
  }

  async updateDemoCallLead(
    id: string,
    input: { status?: string; calledAt?: string; vapiCallId?: string },
  ): Promise<DemoCallLeadRecord | undefined> {
    return this.mutate((state) => {
      const lead = state.demoCallLeads.find((l) => l.id === id);
      if (!lead) return undefined;
      if (input.status) lead.status = input.status as DemoCallLeadRecord["status"];
      if (input.calledAt) lead.calledAt = input.calledAt;
      if (input.vapiCallId) lead.vapiCallId = input.vapiCallId;
      return { ...lead };
    });
  }

  async deleteDemoCallLeadByPhone(phone: string): Promise<void> {
    this.mutate((state) => {
      state.demoCallLeads = state.demoCallLeads.filter((l) => l.phone !== phone.trim());
    });
  }

  async listDemoCallLeads(): Promise<DemoCallLeadRecord[]> {
    return this.readState().demoCallLeads
      .map((lead) => ({ ...lead }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /* Opt-out / Blacklist — stubs for local mode */

  async createOptOut(input: OptOutInput): Promise<OptOutRecord> {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      channel: input.channel,
      contactValue: input.contactValue,
      reason: input.reason ?? "",
      optedOutAt: now,
      source: input.source ?? "api",
      sellerKey: input.sellerKey,
      metadata: input.metadata ?? {},
      createdAt: now,
    };
  }

  async removeOptOut(_channel: string, _contactValue: string): Promise<void> {}

  async isOptedOut(_channel: string, _contactValue: string): Promise<boolean> {
    return false;
  }

  async listOptOuts(_options?: { contactValue?: string; channel?: string; limit?: number }): Promise<OptOutRecord[]> {
    return [];
  }

  /* Frequency Capping — stubs for local mode */

  async logContactFrequency(input: FrequencyLogInput): Promise<FrequencyLogRecord> {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      contactValue: input.contactValue,
      channel: input.channel,
      direction: input.direction ?? "outbound",
      sentAt: now,
      messageId: input.messageId,
      callId: input.callId,
      sellerKey: input.sellerKey,
    };
  }

  async checkFrequencyLimit(_contactValue: string, _sellerKey?: string): Promise<FrequencyCheck> {
    return { allowed: true, contactsToday: 0, contactsThisWeek: 0, maxPerDay: 2, maxPerWeek: 5 };
  }

  async getContactFrequencyLog(_contactValue: string, _options?: { since?: string; channel?: string; limit?: number }): Promise<FrequencyLogRecord[]> {
    return [];
  }

  /* Message Templates — stubs for local mode */

  async listMessageTemplates(_options?: { category?: string; vertical?: string; channel?: string; sellerKey?: string; active?: boolean }): Promise<MessageTemplateRecord[]> {
    return [];
  }

  async getMessageTemplate(_idOrSlug: string): Promise<MessageTemplateRecord | undefined> {
    return undefined;
  }

  async createMessageTemplate(input: MessageTemplateInput): Promise<MessageTemplateRecord> {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      slug: input.slug ?? input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: input.name,
      channel: input.channel ?? "whatsapp",
      category: input.category ?? "recovery",
      vertical: input.vertical ?? "general",
      sellerKey: input.sellerKey,
      subject: input.subject,
      bodyWhatsapp: input.bodyWhatsapp,
      bodySms: input.bodySms,
      bodyEmailHtml: input.bodyEmailHtml,
      bodyEmailText: input.bodyEmailText,
      variables: input.variables ?? [],
      active: input.active ?? true,
      usageCount: 0,
      conversionCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateMessageTemplate(id: string, input: Partial<MessageTemplateInput>): Promise<MessageTemplateRecord> {
    const now = new Date().toISOString();
    return {
      id,
      slug: input.slug ?? "unknown",
      name: input.name ?? "Unknown",
      channel: input.channel ?? "whatsapp",
      category: input.category ?? "recovery",
      vertical: input.vertical ?? "general",
      sellerKey: input.sellerKey,
      subject: input.subject,
      bodyWhatsapp: input.bodyWhatsapp ?? "",
      bodySms: input.bodySms,
      bodyEmailHtml: input.bodyEmailHtml,
      bodyEmailText: input.bodyEmailText,
      variables: input.variables ?? [],
      active: input.active ?? true,
      usageCount: 0,
      conversionCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async incrementTemplateUsage(_id: string, _converted?: boolean): Promise<void> {}

  /* A/B Testing — stubs for local mode */

  async createABTest(input: ABTestInput): Promise<ABTestRecord> {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      name: input.name,
      status: "draft",
      templateAId: input.templateAId,
      templateBId: input.templateBId,
      channel: input.channel ?? "whatsapp",
      sellerKey: input.sellerKey,
      totalSentA: 0,
      totalSentB: 0,
      totalDeliveredA: 0,
      totalDeliveredB: 0,
      totalClickedA: 0,
      totalClickedB: 0,
      totalConvertedA: 0,
      totalConvertedB: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getABTest(_id: string): Promise<ABTestRecord | undefined> {
    return undefined;
  }

  async listABTests(_options?: { status?: string; sellerKey?: string }): Promise<ABTestRecord[]> {
    return [];
  }

  async updateABTest(id: string, input: Partial<ABTestRecord>): Promise<ABTestRecord> {
    const now = new Date().toISOString();
    return {
      id,
      name: input.name ?? "Unknown",
      status: input.status ?? "draft",
      templateAId: input.templateAId ?? "",
      templateBId: input.templateBId ?? "",
      channel: input.channel ?? "whatsapp",
      sellerKey: input.sellerKey,
      totalSentA: input.totalSentA ?? 0,
      totalSentB: input.totalSentB ?? 0,
      totalDeliveredA: input.totalDeliveredA ?? 0,
      totalDeliveredB: input.totalDeliveredB ?? 0,
      totalClickedA: input.totalClickedA ?? 0,
      totalClickedB: input.totalClickedB ?? 0,
      totalConvertedA: input.totalConvertedA ?? 0,
      totalConvertedB: input.totalConvertedB ?? 0,
      winner: input.winner,
      confidencePct: input.confidencePct,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
  }

  async createABTestAssignment(input: { abTestId: string; contactValue: string; variant: "a" | "b"; messageId?: string }): Promise<ABTestAssignmentRecord> {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      abTestId: input.abTestId,
      contactValue: input.contactValue,
      variant: input.variant,
      messageId: input.messageId,
      delivered: false,
      clicked: false,
      converted: false,
      createdAt: now,
    };
  }

  async getABTestAssignment(_abTestId: string, _contactValue: string): Promise<ABTestAssignmentRecord | undefined> {
    return undefined;
  }

  async updateABTestAssignment(_id: string, _input: Partial<{ delivered: boolean; clicked: boolean; converted: boolean }>): Promise<void> {}

  /* Recovery Funnel — stubs for local mode */

  async upsertFunnelSnapshot(input: Omit<RecoveryFunnelSnapshot, "id" | "createdAt">): Promise<RecoveryFunnelSnapshot> {
    return {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
  }

  async getFunnelSnapshots(_options: { startDate: string; endDate: string; sellerKey?: string; channel?: string }): Promise<RecoveryFunnelSnapshot[]> {
    return [];
  }
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
    return undefined;
  }

  return clampPercent(value);
}

function clampLeadLimit(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}

function normalizeContactValue(channel: MessagingChannel, value: string) {
  if (channel === "whatsapp" || channel === "sms") {
    return normalizePhone(value);
  }

  return normalizeEmail(value);
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
  const visiblePaymentIds = new Set(visibleLeads.map((lead) => lead.paymentId));
  const leadByPaymentId = new Map(visibleLeads.map((lead) => [lead.paymentId, lead]));
  const leadByPublicId = new Map(visibleLeads.map((lead) => [lead.leadId, lead]));
  const conversationById = new Map(
    input.conversations.map((conversation) => [conversation.id, conversation]),
  );
  const dayMap = new Map(
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
  const activities: CalendarSnapshot["activities"] = [];

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
      (relatedConversation?.leadId
        ? leadByPublicId.get(relatedConversation.leadId)
        : undefined);

    if (allowedLeadIds) {
      const visible =
        (message.leadId && allowedLeadIds.has(message.leadId)) ||
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



declare global {
  var __shieldRecoveryStorage__: RecoveryStorage | undefined;
}

export function getStorageService(): RecoveryStorage {
  const database = getPlatformBootstrapService().getResolvedDatabaseSettings();
  const hasConnectionSettingsApi =
    globalThis.__shieldRecoveryStorage__ &&
    typeof globalThis.__shieldRecoveryStorage__.getConnectionSettings === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.saveConnectionSettings === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.listSellerUsers === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.findSellerUserByEmail === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.saveSellerUser === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.touchSellerUserLogin === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.listSellerInvites === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.findSellerInviteByToken === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.createSellerInvite === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.markSellerInviteAccepted === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.getQueueOverview === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.listQueueJobs === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.listSystemLogs === "function" &&
    typeof globalThis.__shieldRecoveryStorage__.listWebhookEvents === "function";
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
