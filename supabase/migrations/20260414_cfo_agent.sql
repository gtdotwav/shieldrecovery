-- CFO Agent: Conversations + Proactive Insights

CREATE TABLE IF NOT EXISTS cfo_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfo_conversations_user ON cfo_conversations (user_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS cfo_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT,
  category TEXT NOT NULL CHECK (category IN ('cash_flow', 'delinquency', 'recovery', 'forecast', 'anomaly', 'opportunity', 'performance')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'positive')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfo_insights_seller ON cfo_insights (seller_key, read, created_at DESC);
CREATE INDEX idx_cfo_insights_unread ON cfo_insights (read, created_at DESC) WHERE read = false;
