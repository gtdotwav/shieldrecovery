-- Marketing scenarios: editable data snapshots for the marketing dashboard
CREATE TABLE IF NOT EXISTS marketing_scenarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  -- Monthly chart data (JSON array of { label, recovered, lost, revenue })
  chart_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- KPI overrides
  total_recovered INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  recovery_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  avg_recovery_time_hours DECIMAL(8, 2) NOT NULL DEFAULT 0,
  active_recoveries INTEGER NOT NULL DEFAULT 0,
  -- Showcase highlights (JSON array of { title, metric, description, icon })
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Channel breakdown (JSON { whatsapp, email, voice, sms })
  channels JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Strategy notes (markdown text)
  strategy_notes TEXT DEFAULT '',
  -- Audience segments (JSON array of { name, size, conversion_rate, description })
  audience_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Metadata
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX marketing_scenarios_active_idx ON marketing_scenarios(is_active);
CREATE INDEX marketing_scenarios_created_at_idx ON marketing_scenarios(created_at DESC);
