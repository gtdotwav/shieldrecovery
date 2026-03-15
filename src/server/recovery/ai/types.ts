import type {
  FollowUpContact,
  MessagingChannel,
} from "@/server/recovery/types";

/* ── Recovery probability ── */

export type RecoveryProbability = "high" | "medium" | "low" | "manual";

export type RecoveryClassification = {
  probability: RecoveryProbability;
  score: number; // 0–100
  reasoning: string;
  suggestedStrategy: string;
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
};

export type GeneratedMessage = {
  content: string;
  channel: MessagingChannel;
  tone: "empathetic" | "urgent" | "casual";
  templateUsed: string;
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
  classifications: Array<FollowUpContact & { classification: RecoveryClassification }>;
  strategies: RecoveryStrategy[];
  strategyPerformance: StrategyPerformance[];
};
