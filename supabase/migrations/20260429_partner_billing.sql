-- ============================================================================
-- Partner Billing: usage tracking, invoices, and per-partner pricing
-- ============================================================================

-- Partner usage tracking
CREATE TABLE IF NOT EXISTS partner_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  seller_key TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'lead_created', 'message_sent', 'whatsapp_session', 'call_made', 'payment_recovered'
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_usage_partner_id ON partner_usage_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_usage_created_at ON partner_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_usage_event_type ON partner_usage_logs(event_type);

-- Partner invoices
CREATE TABLE IF NOT EXISTS partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending', 'paid', 'overdue', 'cancelled'
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  line_items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_invoices_partner_id ON partner_invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_status ON partner_invoices(status);

-- Partner billing config (pricing per partner)
CREATE TABLE IF NOT EXISTS partner_billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL DEFAULT 'standard',
  price_per_lead NUMERIC(8,4) NOT NULL DEFAULT 0.50,
  price_per_message NUMERIC(8,4) NOT NULL DEFAULT 0.05,
  price_per_whatsapp_session NUMERIC(8,2) NOT NULL DEFAULT 49.90,
  price_per_call_minute NUMERIC(8,4) NOT NULL DEFAULT 0.15,
  recovery_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  min_monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_day INTEGER NOT NULL DEFAULT 1,
  payment_terms_days INTEGER NOT NULL DEFAULT 15,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
