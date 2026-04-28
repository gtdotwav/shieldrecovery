-- Partner webhook configuration
CREATE TABLE IF NOT EXISTS partner_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['lead.created', 'lead.recovered', 'lead.lost', 'payment.recovered', 'session.connected', 'session.disconnected'],
  active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status INTEGER,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_webhook_partner ON partner_webhook_configs(partner_id);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS partner_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES partner_webhook_configs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_config ON partner_webhook_deliveries(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_created ON partner_webhook_deliveries(created_at);
