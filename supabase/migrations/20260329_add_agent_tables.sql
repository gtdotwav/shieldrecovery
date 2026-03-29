-- =============================================
-- Autonomous Recovery Agent — Schema Additions
-- =============================================

-- Follow-up cadence steps per lead
CREATE TABLE IF NOT EXISTS follow_up_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  customer_id UUID,
  step_number INTEGER NOT NULL DEFAULT 1,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  strategy TEXT NOT NULL DEFAULT 'contextual',
  tone TEXT DEFAULT 'empathetic',
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  skip_reason TEXT,
  outcome TEXT,
  message_id UUID,
  call_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cadence_lead ON follow_up_cadences(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_pending ON follow_up_cadences(scheduled_at)
  WHERE executed_at IS NULL AND skipped_at IS NULL;

-- Insights extracted from transcriptions, conversations, and outcomes
CREATE TABLE IF NOT EXISTS recovery_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT,
  call_id UUID,
  conversation_id UUID,
  source TEXT NOT NULL DEFAULT 'transcription',
  insight_type TEXT NOT NULL DEFAULT 'objection',
  content TEXT NOT NULL,
  customer_sentiment TEXT,
  objections JSONB DEFAULT '[]',
  commitments JSONB DEFAULT '[]',
  preferred_channel TEXT,
  preferred_time TEXT,
  payment_intent_strength TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_lead ON recovery_insights(lead_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON recovery_insights(insight_type);

-- Agent run log — tracks each cron tick
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  inbound_processed INTEGER DEFAULT 0,
  cadences_executed INTEGER DEFAULT 0,
  cadences_scheduled INTEGER DEFAULT 0,
  calls_scheduled INTEGER DEFAULT 0,
  scores_refreshed INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  leads_closed INTEGER DEFAULT 0,
  transcriptions_processed INTEGER DEFAULT 0,
  insights_extracted INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at DESC);
