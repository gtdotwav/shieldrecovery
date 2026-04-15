// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export type RecoveryLeadStatus =
  | "NEW_RECOVERY"
  | "CONTACTING"
  | "WAITING_CUSTOMER"
  | "RECOVERED"
  | "LOST"
  | "EXPIRED";

export type MessagingChannel = "whatsapp" | "email" | "sms" | "voice";
export type ConversationStatus = "open" | "pending" | "closed";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "queued" | "received" | "sent" | "delivered" | "read" | "failed";

export type CallStatus =
  | "queued"
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer"
  | "busy"
  | "voicemail"
  | "cancelled";

export type CallOutcome =
  | "recovered"
  | "callback_scheduled"
  | "interested"
  | "no_interest"
  | "wrong_number"
  | "voicemail_left"
  | "no_voicemail"
  | "technical_issue"
  | "other";

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

export type Lead = {
  id: string;
  leadId: string;
  paymentId: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  paymentValue: number;
  product?: string;
  failureReason?: string;
  status: RecoveryLeadStatus;
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;
  recoveredAt?: string;
};

export type LeadListParams = {
  status?: RecoveryLeadStatus;
  assignedAgent?: string;
  limit?: number;
  offset?: number;
};

export type LeadUpdateInput = {
  status?: RecoveryLeadStatus;
  assignedAgent?: string;
};

export type LeadTransitionInput = {
  status: RecoveryLeadStatus;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Conversation / Inbox
// ---------------------------------------------------------------------------

export type Conversation = {
  id: string;
  leadId?: string;
  customerId?: string;
  customerName: string;
  channel: MessagingChannel;
  contactValue: string;
  assignedAgent?: string;
  status: ConversationStatus;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  unreadCount?: number;
};

export type Message = {
  id: string;
  conversationId: string;
  channel: MessagingChannel;
  direction: MessageDirection;
  senderName?: string;
  senderAddress: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type InboxListParams = {
  status?: ConversationStatus;
  channel?: MessagingChannel;
  limit?: number;
  offset?: number;
};

export type ReplyInput = {
  message: string;
  channel?: MessagingChannel;
};

export type ConversationStatusInput = {
  status: ConversationStatus;
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type DashboardData = {
  totalLeads: number;
  activeLeads: number;
  recoveredLeads: number;
  recoveredValue: number;
  recoveryRate: number;
  pendingQueue: number;
  openConversations: number;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export type RecoveryAnalytics = {
  totalFailed: number;
  totalRecovered: number;
  recoveryRate: number;
  totalRevenueRecovered: number;
  avgRecoveryTimeHours: number;
  byPeriod?: Array<{
    period: string;
    failed: number;
    recovered: number;
    revenue: number;
  }>;
  [key: string]: unknown;
};

export type AnalyticsParams = {
  from?: string;
  to?: string;
  sellerKey?: string;
};

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export type Call = {
  id: string;
  leadId?: string;
  customerId?: string;
  direction: "inbound" | "outbound";
  fromNumber?: string;
  toNumber: string;
  status: CallStatus;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  transcript?: string;
  transcriptSummary?: string;
  outcome?: CallOutcome;
  outcomeNotes?: string;
  provider: string;
  providerCallId?: string;
  sentiment?: "positive" | "neutral" | "negative";
  sellerKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type CallListParams = {
  status?: CallStatus;
  leadId?: string;
  limit?: number;
  offset?: number;
};

export type CallCreateInput = {
  toNumber: string;
  leadId?: string;
  voiceTone?: "empathetic" | "professional" | "urgent" | "friendly" | "direct";
  voiceGender?: "female" | "male";
  product?: string;
  copy?: string;
  discountPercent?: number;
  couponCode?: string;
};

export type CallStats = {
  total: number;
  completed: number;
  recovered: number;
  averageDuration: number;
  [key: string]: unknown;
};

export type CallCampaign = {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  totalContacts: number;
  completedContacts: number;
  successfulContacts: number;
  createdAt: string;
  updatedAt: string;
};

export type CallCampaignCreateInput = {
  name: string;
  description?: string;
  filterCriteria?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export type CheckoutSession = {
  id: string;
  shortId: string;
  amount: number;
  currency: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  checkoutUrl?: string;
  createdAt: string;
  [key: string]: unknown;
};

export type CheckoutSessionCreateInput = {
  amount: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  product?: string;
  sellerKey?: string;
  metadata?: Record<string, unknown>;
};

export type CheckoutProcessInput = {
  sessionId: string;
  paymentMethod: "pix" | "card" | "boleto";
  cardToken?: string;
  installments?: number;
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type MessageTemplate = {
  id: string;
  name: string;
  slug: string;
  category: "recovery" | "followup" | "notification" | "promotional";
  vertical: string;
  channel: MessagingChannel;
  subject?: string;
  bodyWhatsapp?: string;
  bodySms?: string;
  bodyEmailHtml?: string;
  bodyEmailText?: string;
  variables?: Record<string, unknown>;
  active: boolean;
  usageCount: number;
  conversionCount: number;
  sellerKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type TemplateCreateInput = {
  name: string;
  slug?: string;
  category?: string;
  vertical?: string;
  channel?: MessagingChannel;
  subject?: string;
  bodyWhatsapp?: string;
  bodySms?: string;
  bodyEmailHtml?: string;
  bodyEmailText?: string;
  variables?: Record<string, unknown>;
};

export type TemplateListParams = {
  category?: string;
  channel?: MessagingChannel;
  active?: boolean;
};

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

export type FunnelData = {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  totalConverted: number;
  totalOptedOut: number;
  totalRevenueRecovered: number;
  [key: string]: unknown;
};

export type FunnelSnapshot = FunnelData & {
  snapshotDate: string;
  sellerKey?: string;
  channel?: string;
};

export type FunnelParams = {
  from?: string;
  to?: string;
  sellerKey?: string;
  channel?: string;
};

// ---------------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------------

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export type ExportParams = {
  format?: "csv" | "json";
  status?: string;
};

// ---------------------------------------------------------------------------
// A/B Tests
// ---------------------------------------------------------------------------

export type ABTest = {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "archived";
  channel: string;
  templateAId: string;
  templateBId: string;
  totalSentA: number;
  totalSentB: number;
  totalConvertedA: number;
  totalConvertedB: number;
  winner?: "a" | "b" | "tie";
  confidencePct?: number;
  createdAt: string;
  updatedAt: string;
};

export type ABTestCreateInput = {
  name: string;
  templateAId: string;
  templateBId: string;
  channel?: string;
  sellerKey?: string;
};

// ---------------------------------------------------------------------------
// Marketing Scenarios
// ---------------------------------------------------------------------------

export type MarketingScenario = {
  id: string;
  name: string;
  description?: string;
  status: string;
  triggerType: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type MarketingScenarioCreateInput = {
  name: string;
  description?: string;
  triggerType: string;
  channel?: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Webhook events
// ---------------------------------------------------------------------------

export type WebhookEvent = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
};

// ---------------------------------------------------------------------------
// SDK Configuration
// ---------------------------------------------------------------------------

export type PagRecoveryConfig = {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
};

// ---------------------------------------------------------------------------
// API response wrappers
// ---------------------------------------------------------------------------

export type ApiResponse<T> = {
  data: T;
  status: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  total?: number;
  hasMore?: boolean;
};
