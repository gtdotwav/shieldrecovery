import type {
  ConversationStatus,
  FollowUpContact,
  MessagingChannel,
} from "@/server/recovery/types";

/* ── Recovery probability ── */

export type RecoveryProbability = "high" | "medium" | "low" | "manual";
export type RecoveryUrgency = "immediate" | "today" | "scheduled" | "manual";
export type RecoveryFollowUpMode = "autonomous" | "supervised" | "manual";
export type RecoveryMessageTone =
  | "empathetic"
  | "urgent"
  | "casual"
  | "reassuring"
  | "direct";
export type RecoveryNextActionType =
  | "send_initial_message"
  | "ask_payment_method"
  | "send_follow_up"
  | "wait_for_customer"
  | "generate_new_payment_link"
  | "generate_method_payment_link"
  | "escalate_to_seller"
  | "pause_automation"
  | "review_manually"
  | "close_as_recovered"
  | "close_as_lost";
export type InboundIntent =
  | "payment_intent"
  | "payment_method_pix"
  | "payment_method_card"
  | "payment_method_boleto"
  | "question"
  | "objection"
  | "needs_time"
  | "human_handoff"
  | "friction"
  | "irrelevant";
export type EscalationReason =
  | "seller_policy"
  | "customer_requested_human"
  | "low_confidence"
  | "high_value_case"
  | "sensitive_case"
  | "channel_blocked"
  | "unknown";

export type RecoveryClassification = {
  probability: RecoveryProbability;
  score: number; // 0–100
  reasoning: string;
  suggestedStrategy: string;
  urgency?: RecoveryUrgency;
  preferredChannel?: MessagingChannel;
  recommendedNextAction?: RecoveryNextActionType;
  requiresHuman?: boolean;
};

export type ClassifiedFollowUpContact = FollowUpContact & {
  classification: RecoveryClassification;
};

/* ── Strategy engine ── */

export type StrategyStep = {
  order: number;
  channel: MessagingChannel | "system";
  action: string;
  delayMinutes: number;
  template: string;
  condition?: string;
};

export type RecoveryStrategy = {
  id: string;
  name: string;
  triggerCondition: string;
  failureReasons: string[];
  steps: StrategyStep[];
  enabled: boolean;
};

export type RecoveryDecisionContext = {
  contact: FollowUpContact;
  conversation?: {
    id?: string;
    status?: ConversationStatus;
    channel?: MessagingChannel;
    unreadCount?: number;
    lastInboundAt?: string;
    lastOutboundAt?: string;
  };
  payment?: {
    paymentLink?: string;
    pixCode?: string;
    pixQrCode?: string;
    expiresAt?: string;
  };
  automation?: {
    autonomyMode?: RecoveryFollowUpMode;
    sellerActive?: boolean;
    inboxEnabled?: boolean;
    automationsEnabled?: boolean;
  };
};

export type RecoveryDecision = {
  classification: RecoveryClassification;
  strategy?: RecoveryStrategy;
  nextAction: RecoveryNextActionType;
  reason: string;
  urgency: RecoveryUrgency;
  channel: MessagingChannel | "system";
  timingMinutes: number;
  tone: RecoveryMessageTone;
  followUpMode: RecoveryFollowUpMode;
  requiresHuman: boolean;
  escalationReason?: EscalationReason;
  shouldPauseAutomation: boolean;
  shouldGeneratePaymentLink: boolean;
};

/* ── AI Activity ── */

export type AIActivityType =
  | "sequence_started"
  | "message_sent"
  | "payment_intent_detected"
  | "escalated_to_human"
  | "recovery_closed"
  | "strategy_selected"
  | "lead_classified"
  | "follow_up_scheduled"
  | "response_detected";

export type AIActivityEntry = {
  id: string;
  timestamp: string;
  leadId: string;
  customerName: string;
  actionType: AIActivityType;
  channel?: MessagingChannel;
  outcome: string;
  details?: string;
};

/* ── AI Overview Metrics ── */

export type AIOverviewMetrics = {
  recoveryRate: number;
  activeConversations: number;
  recoveredToday: number;
  totalValueRecovered: number;
  averageRecoveryTimeHours: number;
  strategiesRunning: number;
  messagesGeneratedToday: number;
};

/* ── Message generation ── */

export type MessageContext = {
  customerName: string;
  productName?: string;
  cartValue: number;
  failureReason: string;
  channel: MessagingChannel;
  attemptNumber: number;
  paymentLink?: string;
  pixCode?: string;
  paymentMethod?: string;
  tonePreference?: RecoveryMessageTone;
  nextAction?: RecoveryNextActionType;
  recoveryUrgency?: RecoveryUrgency;
  decisionReason?: string;
  sellerGuidance?: string;
};

export type GeneratedMessage = {
  content: string;
  channel: MessagingChannel;
  tone: RecoveryMessageTone;
  templateUsed: string;
};

export type ConversationReplyContext = {
  customerName: string;
  productName?: string;
  latestInboundContent?: string;
  latestInboundIntent?: InboundIntent;
  retryLink?: string;
  pixCode?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  failureReason?: string;
  tonePreference?: RecoveryMessageTone;
  nextAction?: RecoveryNextActionType;
  decisionReason?: string;
  requiresHumanHandoff?: boolean;
  sellerGuidance?: string;
};

export type InboundIntentClassification = {
  intent: InboundIntent;
  confidence: number;
  reasoning: string;
  requiresHuman: boolean;
  escalationReason?: EscalationReason;
};

export type ConversationFollowUpDecision = {
  intent?: InboundIntentClassification;
  nextAction: RecoveryNextActionType;
  reason: string;
  channel: MessagingChannel | "system";
  tone: RecoveryMessageTone;
  sendNow: boolean;
  followUpMode: RecoveryFollowUpMode;
  requiresHuman: boolean;
  timingMinutes?: number;
  escalationReason?: EscalationReason;
};

/* ── Followup timeline ── */

export type TimelineEventType =
  | "webhook_received"
  | "ai_analysis"
  | "message_sent"
  | "user_response"
  | "payment_link_generated"
  | "payment_confirmed"
  | "escalated"
  | "lead_moved";

export type FollowupTimelineEvent = {
  id: string;
  timestamp: string;
  type: TimelineEventType;
  label: string;
  detail?: string;
  channel?: MessagingChannel;
};

/* ── Learning metrics ── */

export type StrategyPerformance = {
  strategyId: string;
  strategyName: string;
  timesUsed: number;
  successRate: number;
  averageRecoveryTimeHours: number;
  responseRate: number;
};

/* ── AI Dashboard aggregate ── */

export type AIDashboardData = {
  metrics: AIOverviewMetrics;
  activity: AIActivityEntry[];
  classifications: ClassifiedFollowUpContact[];
  strategies: RecoveryStrategy[];
  strategyPerformance: StrategyPerformance[];
};
