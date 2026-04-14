export const SUPPORTED_PAYMENT_EVENTS = [
  "payment_created",
  "payment_pending",
  "payment_processing",
  "payment_succeeded",
  "payment_failed",
  "payment_refused",
  "payment_expired",
  "payment_canceled",
  "payment_refunded",
  "payment_partially_refunded",
  "payment_chargeback",
] as const;

export const RECOVERABLE_PAYMENT_EVENTS = [
  "payment_failed",
  "payment_refused",
  "payment_expired",
] as const;

export const RECOVERY_LEAD_PIPELINE = [
  "NEW_RECOVERY",
  "CONTACTING",
  "WAITING_CUSTOMER",
  "RECOVERED",
  "LOST",
] as const;

export const JOB_QUEUES = [
  "recovery-jobs",
  "payment-retry-jobs",
  "notification-jobs",
] as const;

export const MESSAGING_CHANNELS = ["whatsapp", "email", "sms", "voice"] as const;

export const CONVERSATION_STATUSES = ["open", "pending", "closed"] as const;

export const MESSAGE_DIRECTIONS = ["inbound", "outbound"] as const;

export const MESSAGE_STATUSES = [
  "queued",
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;

export const WHATSAPP_PROVIDERS = ["cloud_api", "web_api"] as const;
export const EMAIL_PROVIDERS = ["sendgrid"] as const;
export const CALENDAR_NOTE_LANES = [
  "operations",
  "automations",
  "revenue",
] as const;
export const WHATSAPP_WEB_SESSION_STATUSES = [
  "disconnected",
  "pending_qr",
  "connected",
  "expired",
  "error",
] as const;
export const SELLER_MESSAGING_APPROACHES = [
  "friendly",
  "professional",
  "urgent",
] as const;
export const SELLER_AUTONOMY_MODES = [
  "assisted",
  "supervised",
  "autonomous",
] as const;
export const SELLER_INVITE_STATUSES = [
  "pending",
  "accepted",
  "revoked",
] as const;

export type SupportedPaymentEvent = (typeof SUPPORTED_PAYMENT_EVENTS)[number];
export type RecoverablePaymentEvent = (typeof RECOVERABLE_PAYMENT_EVENTS)[number];
export type RecoveryLeadStatus = (typeof RECOVERY_LEAD_PIPELINE)[number];
export type QueueName = (typeof JOB_QUEUES)[number];
export type MessagingChannel = (typeof MESSAGING_CHANNELS)[number];
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export type WhatsAppProvider = (typeof WHATSAPP_PROVIDERS)[number];
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];
export type CalendarNoteLane = (typeof CALENDAR_NOTE_LANES)[number];
export type WhatsAppWebSessionStatus =
  (typeof WHATSAPP_WEB_SESSION_STATUSES)[number];
export type SellerAutonomyMode = (typeof SELLER_AUTONOMY_MODES)[number];
export type SellerMessagingApproach =
  (typeof SELLER_MESSAGING_APPROACHES)[number];
export type SellerInviteStatus = (typeof SELLER_INVITE_STATUSES)[number];

export type MessageMetadata = {
  kind?: "recovery_prompt" | "ai_draft" | "operator_note";
  generatedBy?: "workflow" | "ai" | "operator";
  strategyId?: string;
  strategyName?: string;
  recoveryProbability?: "high" | "medium" | "low" | "manual";
  recoveryScore?: number;
  recoveryUrgency?: "immediate" | "today" | "scheduled" | "manual";
  nextAction?:
    | "send_initial_message"
    | "send_checkout_link"
    | "ask_payment_method"
    | "send_follow_up"
    | "wait_for_customer"
    | "generate_new_payment_link"
    | "generate_method_payment_link"
    | "escalate_to_seller"
    | "pause_automation"
    | "review_manually"
    | "close_as_recovered"
    | "close_as_lost"
    | "confirm_payment"
    | "payment_confirmed";
  followUpMode?: "autonomous" | "supervised" | "manual";
  decisionReason?: string;
  selectedMethodType?: "pix" | "card" | "boleto";
  inboundIntent?:
    | "payment_intent"
    | "payment_confirmed"
    | "payment_method_pix"
    | "payment_method_card"
    | "payment_method_boleto"
    | "question"
    | "objection"
    | "needs_time"
    | "human_handoff"
    | "friction"
    | "irrelevant";
  customerName?: string;
  productName?: string;
  product?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  failureReason?: string;
  paymentValue?: number;
  orderId?: string;
  gatewayPaymentId?: string;
  retryLink?: string;
  paymentUrl?: string;
  pixCode?: string;
  pixQrCode?: string;
  pixExpiresAt?: string;
  actionLabel?: string;
  messagingApproach?: SellerMessagingApproach;
  retryAttempts?: number;
  retriedFromMessageId?: string;
  complianceCheckSkipped?: boolean;
};

export type NormalizedPaymentEvent = {
  event_id: string;
  event_type: SupportedPaymentEvent;
  timestamp: number;
  payment: {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    failure_code?: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    document?: string;
  };
  metadata: {
    product?: string;
    campaign?: string;
    paymentUrl?: string;
    pixCode?: string;
    pixQrCode?: string;
    pixExpiresAt?: string;
  };
};

export type CustomerRecord = {
  id: string;
  gatewayCustomerId: string;
  name: string;
  email: string;
  phone: string;
  document?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
  gatewayPaymentId: string;
  orderId: string;
  customerId: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
  firstFailureAt?: string;
  recoveredAt?: string;
};

export type PaymentAttemptRecord = {
  id: string;
  paymentId: string;
  attemptNumber: number;
  status: string;
  failureReason?: string;
  paymentLink: string;
  createdAt: string;
};

export type WebhookEventRecord = {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  processed: boolean;
  duplicate: boolean;
  source: string;
  error?: string;
  createdAt: string;
  processedAt?: string;
};

export type AgentRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
};

export type RecoveryLeadRecord = {
  id: string;
  paymentId: string;
  customerId: string;
  leadId: string;
  customerName: string;
  email: string;
  phone: string;
  paymentValue: number;
  product?: string;
  failureReason?: string;
  status: RecoveryLeadStatus;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: string;
  updatedAt: string;
  recoveredAt?: string;
};

export type QueueJobRecord = {
  id: string;
  queueName: QueueName;
  jobType: string;
  payload: Record<string, unknown>;
  runAt: string;
  attempts: number;
  status: "scheduled" | "processing" | "processed" | "failed";
  createdAt: string;
  error?: string;
};

export type ConversationRecord = {
  id: string;
  leadRecordId?: string;
  leadId?: string;
  customerId?: string;
  customerName: string;
  channel: MessagingChannel;
  contactValue: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  status: ConversationStatus;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  leadRecordId?: string;
  leadId?: string;
  customerId?: string;
  channel: MessagingChannel;
  direction: MessageDirection;
  senderName?: string;
  senderAddress: string;
  content: string;
  providerMessageId?: string;
  status: MessageStatus;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
  metadata?: MessageMetadata;
  queuedAt?: string;
  sentAt?: string;
  failedAt?: string;
  clickedAt?: string;
  convertedAt?: string;
  providerStatus?: string;
  deliveryChannel?: string;
};

export type InboxConversation = {
  conversation_id: string;
  lead_id?: string;
  customer_name: string;
  channel: MessagingChannel;
  contact_value: string;
  assigned_agent?: string;
  status: ConversationStatus;
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  message_count: number;
};

export type ConversationThread = {
  conversation: InboxConversation;
  messages: MessageRecord[];
};

export type SystemLogRecord = {
  id: string;
  eventType:
    | "webhook_received"
    | "payment_failed"
    | "recovery_started"
    | "payment_recovered"
    | "retry_attempt"
    | "webhook_rejected"
    | "processing_error"
    | "message_received"
    | "message_status_updated"
    | "message_dispatched"
    | "ai_reply_generated"
    | "worker_job_processed"
    | "worker_job_rescheduled"
    | "worker_job_failed"
    | "duplicate_webhook"
    | "callcenter_checkout"
    | "opt_out_processed"
    | "anticipation_requested"
    | "anticipation_approved"
    | "anticipation_disbursed"
    | "reactivation_campaign_started"
    | "reconciliation_completed"
    | "payment_scores_refreshed"
    | "extrajudicial_notice_sent"
    | "negativation_registered"
    | "negativation_queue_processed"
    | "upsell"
    | "commerce"
    | "outbound_sales"
    | "unsupported";
  level: "info" | "warn" | "error";
  message: string;
  context: Record<string, unknown>;
  createdAt: string;
};

export type ConnectionSettingsRecord = {
  id: string;
  appBaseUrl: string;
  webhookSecret: string;
  webhookToleranceSeconds: number;
  whatsappProvider: WhatsAppProvider;
  whatsappApiBaseUrl: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappWebhookVerifyToken: string;
  whatsappWebSessionId: string;
  whatsappWebSessionStatus: WhatsAppWebSessionStatus;
  whatsappWebSessionQrCode: string;
  whatsappWebSessionPhone: string;
  whatsappWebSessionError: string;
  whatsappWebSessionUpdatedAt: string;
  emailProvider: EmailProvider;
  emailApiKey: string;
  emailFromAddress: string;
  crmApiUrl: string;
  crmApiKey: string;
  openAiApiKey: string;
  updatedAt: string;
};

export type ConnectionSettingsInput = Partial<
  Omit<ConnectionSettingsRecord, "id" | "updatedAt">
>;

export type CalendarNoteRecord = {
  id: string;
  date: string;
  lane: CalendarNoteLane;
  title: string;
  content?: string;
  createdByEmail: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarDaySummary = {
  date: string;
  recoveredRevenue: number;
  recoveredCount: number;
  newLeads: number;
  automationJobs: number;
  outboundMessages: number;
  inboundMessages: number;
  notesCount: number;
};

export type CalendarActivityItem = {
  id: string;
  date: string;
  at: string;
  type: "recovery" | "lead" | "automation" | "message";
  title: string;
  detail: string;
  amount?: number;
  leadId?: string;
  href?: string;
};

export type CalendarSnapshot = {
  month: string;
  days: CalendarDaySummary[];
  notes: CalendarNoteRecord[];
  activities: CalendarActivityItem[];
};

export type SellerAdminControlRecord = {
  id: string;
  sellerKey: string;
  sellerName: string;
  sellerEmail?: string;
  active: boolean;
  recoveryTargetPercent: number;
  reportedRecoveryRatePercent?: number;
  maxAssignedLeads: number;
  inboxEnabled: boolean;
  automationsEnabled: boolean;
  autonomyMode: SellerAutonomyMode;
  messagingApproach: SellerMessagingApproach;
  gatewaySlug?: string;
  gatewayApiKey?: string;
  checkoutUrl?: string;
  checkoutApiKey?: string;
  whitelabelId?: string;
  notes?: string;
  maxContactsPerLeadPerWeek?: number;
  maxContactsPerLeadPerDay?: number;
  smsEnabled?: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  smsFromNumber?: string;
  emailRecoveryEnabled?: boolean;
  preferredChannels?: string[];
  aiNegotiationEnabled?: boolean;
  aiMaxDiscountPct?: number;
  aiNegotiationStrategy?: string;
  updatedAt: string;
};

export type SellerAdminControlInput = {
  sellerKey: string;
  sellerName?: string;
  sellerEmail?: string;
  active?: boolean;
  recoveryTargetPercent?: number;
  reportedRecoveryRatePercent?: number;
  maxAssignedLeads?: number;
  inboxEnabled?: boolean;
  automationsEnabled?: boolean;
  autonomyMode?: SellerAutonomyMode;
  messagingApproach?: SellerMessagingApproach;
  gatewaySlug?: string;
  gatewayApiKey?: string;
  checkoutUrl?: string;
  checkoutApiKey?: string;
  whitelabelId?: string;
  notes?: string;
  maxContactsPerLeadPerWeek?: number;
  maxContactsPerLeadPerDay?: number;
  smsEnabled?: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  smsFromNumber?: string;
  emailRecoveryEnabled?: boolean;
  preferredChannels?: string[];
  aiNegotiationEnabled?: boolean;
  aiMaxDiscountPct?: number;
  aiNegotiationStrategy?: string;
};

/* ── Whitelabel Profiles ── */

export const GATEWAY_PROVIDERS = [
  "pagouai",
  "pagnet",
  "stripe",
  "mercadopago",
  "pagarme",
  "asaas",
  "iugu",
  "pagar_me",
  "hotmart",
  "kiwify",
  "eduzz",
  "monetizze",
  "braip",
  "custom",
] as const;

export type GatewayProvider = (typeof GATEWAY_PROVIDERS)[number];

export type WhitelabelProfileRecord = {
  id: string;
  name: string;
  slug: string;
  gatewayProvider: GatewayProvider;
  gatewayBaseUrl: string;
  gatewayDocsUrl: string;
  gatewayWebhookPath: string;
  checkoutUrl: string;
  checkoutApiKey: string;
  brandAccent: string;
  brandLogo: string;
  active: boolean;
  sellersCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type WhitelabelProfileInput = {
  name: string;
  slug?: string;
  gatewayProvider: GatewayProvider;
  gatewayBaseUrl?: string;
  gatewayDocsUrl?: string;
  gatewayWebhookPath?: string;
  checkoutUrl?: string;
  checkoutApiKey?: string;
  brandAccent?: string;
  brandLogo?: string;
  active?: boolean;
  notes?: string;
};

export type SellerUserRecord = {
  id: string;
  email: string;
  displayName: string;
  agentName: string;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type SellerUserInput = {
  email: string;
  displayName?: string;
  agentName: string;
  passwordHash?: string;
  active?: boolean;
};

export type SellerUserSnapshot = {
  id: string;
  email: string;
  displayName: string;
  agentName: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SellerInviteRecord = {
  id: string;
  token: string;
  email: string;
  suggestedDisplayName?: string;
  agentName?: string;
  note?: string;
  createdByEmail: string;
  status: SellerInviteStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
};

export type SellerInviteInput = {
  email: string;
  suggestedDisplayName?: string;
  agentName?: string;
  note?: string;
  createdByEmail: string;
  expiresInDays?: number;
};

export type SellerInviteSnapshot = {
  id: string;
  token: string;
  email: string;
  suggestedDisplayName?: string;
  agentName?: string;
  note?: string;
  createdByEmail: string;
  status: SellerInviteStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  expired: boolean;
  inviteUrl: string;
};

export type SellerWebhookSnapshot = {
  sellerKey: string;
  url: string;
  eventCount: number;
  processedCount: number;
  failedCount: number;
  pendingCount: number;
  lastReceivedAt?: string;
  lastProcessedAt?: string;
  lastEventType?: string;
  lastError?: string;
  status: "idle" | "healthy" | "attention";
};

export type AdminSellerSnapshot = {
  sellerKey: string;
  sellerName: string;
  sellerEmail?: string;
  activeLeads: number;
  waitingCustomer: number;
  recoveredCount: number;
  recoveredRevenue: number;
  openConversations: number;
  unreadConversations: number;
  platformRecoveryRate: number;
  realRecoveryRate: number;
  lastActivityAt?: string;
  control: SellerAdminControlRecord;
  webhook: SellerWebhookSnapshot;
};

export type WorkerQueueSnapshot = {
  scheduled: number;
  processing: number;
  processed: number;
  failed: number;
  dueNow: number;
  oldestScheduledAt?: string;
  oldestDueAt?: string;
  queueLagMinutes: number;
  batchSize: number;
  concurrency: number;
  recentJobs: QueueJobRecord[];
  recentEvents: SystemLogRecord[];
};

export type QueueOverviewSnapshot = {
  scheduled: number;
  processing: number;
  processed: number;
  failed: number;
  dueNow: number;
  oldestScheduledAt?: string;
  oldestDueAt?: string;
};

export type AdminPanelSnapshot = {
  totalSellers: number;
  activeSellers: number;
  totalActiveLeads: number;
  totalRecoveredRevenue: number;
  totalUnreadConversations: number;
  unassignedLeads: number;
  pendingInvites: number;
  sellers: AdminSellerSnapshot[];
  sellerUsers: SellerUserSnapshot[];
  sellerInvites: SellerInviteSnapshot[];
  worker: WorkerQueueSnapshot;
};

export type StorageState = {
  payments: PaymentRecord[];
  customers: CustomerRecord[];
  paymentAttempts: PaymentAttemptRecord[];
  webhookEvents: WebhookEventRecord[];
  agents: AgentRecord[];
  leads: RecoveryLeadRecord[];
  queueJobs: QueueJobRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  logs: SystemLogRecord[];
  calendarNotes: CalendarNoteRecord[];
  sellerAdminControls: SellerAdminControlRecord[];
  sellerUsers: SellerUserRecord[];
  sellerInvites: SellerInviteRecord[];
  quizLeads: QuizLeadRecord[];
  demoCallLeads: DemoCallLeadRecord[];
  connectionSettings: ConnectionSettingsRecord;
  meta: {
    lastAssignedAgentIndex: number;
  };
};

export type RecoveryAnalytics = {
  total_failed_payments: number;
  recovered_payments: number;
  recovery_rate: number;
  recovered_revenue: number;
  average_recovery_time_hours: number;
  active_recoveries: number;
};

export type CreateCalendarNoteInput = {
  date: string;
  lane: CalendarNoteLane;
  title: string;
  content?: string;
  createdByEmail: string;
  createdByRole: string;
};

export type FollowUpContact = {
  lead_id: string;
  customer_name: string;
  email: string;
  phone: string;
  product?: string;
  payment_value: number;
  payment_status: string;
  payment_method: string;
  lead_status: RecoveryLeadStatus;
  order_id: string;
  gateway_payment_id: string;
  assigned_agent?: string;
  created_at?: string;
  updated_at: string;
};

export type RetryPaymentInput = {
  payment_id?: string;
  gateway_payment_id?: string;
  order_id?: string;
  reason?: string;
};

/* ── CallCenter ── */

export const CALL_STATUSES = [
  "queued",
  "ringing",
  "in_progress",
  "completed",
  "failed",
  "no_answer",
  "busy",
  "voicemail",
  "cancelled",
] as const;

export const CALL_DIRECTIONS = ["inbound", "outbound"] as const;

export const CALL_OUTCOMES = [
  "recovered",
  "callback_scheduled",
  "interested",
  "no_interest",
  "wrong_number",
  "voicemail_left",
  "no_voicemail",
  "technical_issue",
  "other",
] as const;

export const CALL_PROVIDERS = [
  "vapi",
  "bland",
  "retell",
  "twilio",
  "manual",
] as const;

export const CALL_SENTIMENTS = ["positive", "neutral", "negative"] as const;

export const CALL_CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

export type CallStatus = (typeof CALL_STATUSES)[number];
export type CallDirection = (typeof CALL_DIRECTIONS)[number];
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export type CallProvider = (typeof CALL_PROVIDERS)[number];
export type CallSentiment = (typeof CALL_SENTIMENTS)[number];
export type CallCampaignStatus = (typeof CALL_CAMPAIGN_STATUSES)[number];

export type CallRecord = {
  id: string;
  campaignId?: string;
  leadId?: string;
  customerId?: string;
  agentId?: string;
  direction: CallDirection;
  fromNumber?: string;
  toNumber: string;
  status: CallStatus;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  ringDurationSeconds: number;
  recordingUrl?: string;
  recordingDurationSeconds?: number;
  transcript?: string;
  transcriptSummary?: string;
  outcome?: CallOutcome;
  outcomeNotes?: string;
  callbackScheduledAt?: string;
  provider: CallProvider;
  providerCallId?: string;
  providerCost?: number;
  sentiment?: CallSentiment;
  copy?: string;
  product?: string;
  discountPercent?: number;
  couponCode?: string;
  chosenPaymentMethod?: "pix" | "card" | "boleto";
  checkoutSessionId?: string;
  checkoutUrl?: string;
  voiceTone?: VoiceTone;
  voiceGender?: VoiceGender;
  sellerKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CallCampaignRecord = {
  id: string;
  name: string;
  description: string;
  status: CallCampaignStatus;
  filterCriteria: Record<string, unknown>;
  totalContacts: number;
  completedContacts: number;
  successfulContacts: number;
  createdBy?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CallEventRecord = {
  id: string;
  callId: string;
  eventType: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type CallAnalytics = {
  totalCalls: number;
  completedCalls: number;
  answeredCalls: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  answerRate: number;
  recoveredFromCalls: number;
  callbacksScheduled: number;
  byOutcome: Record<string, number>;
  byStatus: Record<string, number>;
};

export type CreateCallInput = {
  campaignId?: string;
  leadId?: string;
  customerId?: string;
  agentId?: string;
  direction?: CallDirection;
  fromNumber?: string;
  toNumber: string;
  provider?: CallProvider;
  providerCallId?: string;
  copy?: string;
  product?: string;
  discountPercent?: number;
  couponCode?: string;
  voiceTone?: VoiceTone;
  voiceGender?: VoiceGender;
  sellerKey?: string;
  metadata?: Record<string, unknown>;
};

export const VOICE_TONES = [
  "empathetic",
  "professional",
  "urgent",
  "friendly",
  "direct",
] as const;

export const VOICE_GENDERS = ["female", "male"] as const;

export type VoiceTone = (typeof VOICE_TONES)[number];
export type VoiceGender = (typeof VOICE_GENDERS)[number];

export type CallcenterSettingsRecord = {
  id: string;
  sellerKey: string;
  voiceTone: VoiceTone;
  voiceGender: VoiceGender;
  discountPercent: number;
  couponCode: string;
  defaultCopy: string;
  defaultProduct: string;
  provider: CallProvider;
  maxCallsPerDay: number;
  autoCallEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CallcenterSettingsInput = {
  sellerKey: string;
  voiceTone?: VoiceTone;
  voiceGender?: VoiceGender;
  discountPercent?: number;
  couponCode?: string;
  defaultCopy?: string;
  defaultProduct?: string;
  provider?: CallProvider;
  maxCallsPerDay?: number;
  autoCallEnabled?: boolean;
};

/* ── Quiz leads ── */

export type QuizLeadRecord = {
  id: string;
  email: string;
  answers: string[];
  status: "new" | "contacted" | "converted";
  whatsappSentAt?: string;
  notes?: string;
  createdAt: string;
};

/* ── Demo Call Leads ── */

export type DemoCallLeadRecord = {
  id: string;
  name: string;
  phone: string;
  calledAt?: string;
  vapiCallId?: string;
  status: "pending" | "calling" | "completed" | "failed";
  createdAt: string;
};

export type UpdateCallInput = {
  status?: CallStatus;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  ringDurationSeconds?: number;
  recordingUrl?: string;
  recordingDurationSeconds?: number;
  transcript?: string;
  transcriptSummary?: string;
  outcome?: CallOutcome;
  outcomeNotes?: string;
  callbackScheduledAt?: string;
  providerCallId?: string;
  providerCost?: number;
  sentiment?: CallSentiment;
  chosenPaymentMethod?: "pix" | "card" | "boleto";
  checkoutSessionId?: string;
  checkoutUrl?: string;
  metadata?: Record<string, unknown>;
};

// ── Affiliates ──

export const AFFILIATE_REFERRAL_STATUSES = [
  "pending",
  "active",
  "inactive",
] as const;
export type AffiliateReferralStatus =
  (typeof AFFILIATE_REFERRAL_STATUSES)[number];

export type AffiliateLinkRecord = {
  id: string;
  sellerKey: string;
  sellerEmail: string;
  code: string;
  label?: string;
  commissionPct: number;
  clicks: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AffiliateLinkInput = {
  sellerKey: string;
  sellerEmail: string;
  label?: string;
  commissionPct?: number;
};

export type AffiliateReferralRecord = {
  id: string;
  affiliateLinkId: string;
  referrerSellerKey: string;
  referredEmail: string;
  referredSellerKey?: string;
  status: AffiliateReferralStatus;
  createdAt: string;
  activatedAt?: string;
};

export type AffiliateStats = {
  totalLinks: number;
  totalClicks: number;
  totalSignups: number;
  activeReferrals: number;
  pendingReferrals: number;
};

/* ── Opt-out / Blacklist ── */

export const OPT_OUT_CHANNELS = ["whatsapp", "sms", "email", "voice", "all"] as const;
export type OptOutChannel = (typeof OPT_OUT_CHANNELS)[number];

export const OPT_OUT_SOURCES = [
  "inbound_keyword",
  "admin_manual",
  "api",
  "legal_request",
] as const;
export type OptOutSource = (typeof OPT_OUT_SOURCES)[number];

export type OptOutRecord = {
  id: string;
  channel: OptOutChannel;
  contactValue: string;
  reason: string;
  optedOutAt: string;
  source: OptOutSource;
  sellerKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type OptOutInput = {
  channel: OptOutChannel;
  contactValue: string;
  reason?: string;
  source?: OptOutSource;
  sellerKey?: string;
  metadata?: Record<string, unknown>;
};

/* ── Contact Frequency Log ── */

export type FrequencyLogRecord = {
  id: string;
  contactValue: string;
  channel: string;
  direction: string;
  sentAt: string;
  messageId?: string;
  callId?: string;
  sellerKey?: string;
};

export type FrequencyLogInput = {
  contactValue: string;
  channel: string;
  direction?: string;
  messageId?: string;
  callId?: string;
  sellerKey?: string;
};

export type FrequencyCheck = {
  allowed: boolean;
  reason?: string;
  contactsToday: number;
  contactsThisWeek: number;
  maxPerDay: number;
  maxPerWeek: number;
};

/* ── Message Templates ── */

export const TEMPLATE_CATEGORIES = [
  "recovery",
  "followup",
  "notification",
  "promotional",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_VERTICALS = [
  "general",
  "ecommerce",
  "saas",
  "infoproduct",
] as const;
export type TemplateVertical = (typeof TEMPLATE_VERTICALS)[number];

export type MessageTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  category: TemplateCategory;
  vertical: TemplateVertical;
  channel: string;
  subject?: string;
  bodyWhatsapp: string;
  bodySms?: string;
  bodyEmailHtml?: string;
  bodyEmailText?: string;
  variables: string[];
  active: boolean;
  usageCount: number;
  conversionCount: number;
  sellerKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageTemplateInput = {
  name: string;
  slug?: string;
  category?: TemplateCategory;
  vertical?: TemplateVertical;
  channel?: string;
  subject?: string;
  bodyWhatsapp: string;
  bodySms?: string;
  bodyEmailHtml?: string;
  bodyEmailText?: string;
  variables?: string[];
  active?: boolean;
  sellerKey?: string;
};

export type RenderedTemplate = {
  channel: string;
  subject?: string;
  body: string;
  templateId: string;
  templateSlug: string;
};

/* ── A/B Testing ── */

export const AB_TEST_STATUSES = [
  "draft",
  "running",
  "completed",
  "archived",
] as const;
export type ABTestStatus = (typeof AB_TEST_STATUSES)[number];

export type ABTestRecord = {
  id: string;
  name: string;
  status: ABTestStatus;
  templateAId: string;
  templateBId: string;
  channel: string;
  sellerKey?: string;
  totalSentA: number;
  totalSentB: number;
  totalDeliveredA: number;
  totalDeliveredB: number;
  totalClickedA: number;
  totalClickedB: number;
  totalConvertedA: number;
  totalConvertedB: number;
  winner?: "a" | "b" | "tie";
  confidencePct?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ABTestInput = {
  name: string;
  templateAId: string;
  templateBId: string;
  channel?: string;
  sellerKey?: string;
};

export type ABTestAssignmentRecord = {
  id: string;
  abTestId: string;
  contactValue: string;
  variant: "a" | "b";
  messageId?: string;
  delivered: boolean;
  clicked: boolean;
  converted: boolean;
  createdAt: string;
};

/* ── Recovery Funnel Snapshots ── */

export type RecoveryFunnelSnapshot = {
  id: string;
  snapshotDate: string;
  sellerKey?: string;
  channel: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  totalConverted: number;
  totalOptedOut: number;
  totalRevenueRecovered: number;
  createdAt: string;
};

/* ── Extended Seller Admin Controls (new fields from migration) ── */

export type SellerFrequencyConfig = {
  maxContactsPerLeadPerWeek: number;
  maxContactsPerLeadPerDay: number;
  smsEnabled: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  smsFromNumber?: string;
  emailRecoveryEnabled: boolean;
  preferredChannels: string[];
  aiNegotiationEnabled: boolean;
  aiMaxDiscountPct: number;
  aiNegotiationStrategy: string;
};

/* ── Negotiation Engine ── */

export type NegotiationOffer = {
  discountPct: number;
  strategy: "progressive" | "fixed" | "conditional";
  reason: string;
  expiresAt?: string;
  couponCode?: string;
};

export type NegotiationContext = {
  leadId: string;
  currentStep: number;
  previousOffers: NegotiationOffer[];
  maxDiscountPct: number;
  customerSentiment: string;
  paymentValue: number;
};

/* ── Multi-channel Delivery ── */

export type ChannelDeliveryResult = {
  channel: string;
  status: "sent" | "delivered" | "failed" | "skipped";
  providerMessageId?: string;
  error?: string;
  fallbackTriggered?: boolean;
};

export type MultiChannelSequenceStep = {
  channel: string;
  delayMinutes: number;
  templateSlug?: string;
  condition: "always" | "if_not_delivered" | "if_not_read";
};
