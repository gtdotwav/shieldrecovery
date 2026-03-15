export const SUPPORTED_PAYMENT_EVENTS = [
  "payment_created",
  "payment_pending",
  "payment_processing",
  "payment_succeeded",
  "payment_failed",
  "payment_refused",
  "payment_expired",
  "payment_canceled",
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

export const MESSAGING_CHANNELS = ["whatsapp", "email", "sms"] as const;

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
export const WHATSAPP_WEB_SESSION_STATUSES = [
  "disconnected",
  "pending_qr",
  "connected",
  "expired",
  "error",
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
export type WhatsAppWebSessionStatus =
  (typeof WHATSAPP_WEB_SESSION_STATUSES)[number];

export type MessageMetadata = {
  kind?: "recovery_prompt" | "ai_draft" | "operator_note";
  generatedBy?: "workflow" | "ai" | "operator";
  product?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  failureReason?: string;
  paymentValue?: number;
  orderId?: string;
  gatewayPaymentId?: string;
  retryLink?: string;
  actionLabel?: string;
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
  };
  metadata: {
    product?: string;
    campaign?: string;
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
  source: "shield-gateway";
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
  status: "scheduled" | "processed" | "failed";
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
    | "ai_reply_generated";
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
