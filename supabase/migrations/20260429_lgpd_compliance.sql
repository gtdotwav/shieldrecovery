-- LGPD Compliance tables
-- Consent tracking, data deletion requests, audit trail, retention policies

-- Consent records
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'whatsapp', 'email', 'sms', 'voice'
  consent_type TEXT NOT NULL, -- 'recovery_contact', 'marketing', 'data_processing'
  granted BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL, -- 'webhook_implicit', 'explicit_opt_in', 'partner_provided', 'user_request'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_customer ON consent_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_consent_contact ON consent_records(contact_value);
CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_records(consent_type, granted);

-- Data deletion requests (LGPD Art. 18)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'denied'
  reason TEXT,
  denial_reason TEXT,
  tables_affected JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_status ON data_deletion_requests(status);

-- Data access log (audit trail for LGPD Art. 37)
CREATE TABLE IF NOT EXISTS data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL, -- 'view_customer', 'export_data', 'delete_data', 'update_customer'
  resource_type TEXT NOT NULL, -- 'customer', 'lead', 'conversation', 'payment'
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_log_user ON data_access_log(user_email);
CREATE INDEX IF NOT EXISTS idx_access_log_resource ON data_access_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_log_created ON data_access_log(created_at);

-- Data retention policy
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (resource_type, retention_days, auto_delete, description) VALUES
  ('recovery_leads', 365, false, 'Leads de recuperacao — manter por 1 ano'),
  ('conversations', 180, false, 'Conversas — manter por 6 meses'),
  ('messages', 180, false, 'Mensagens — manter por 6 meses'),
  ('system_logs', 90, true, 'Logs do sistema — auto-delete apos 90 dias'),
  ('webhook_events', 90, true, 'Eventos de webhook — auto-delete apos 90 dias'),
  ('queue_jobs', 30, true, 'Jobs processados — auto-delete apos 30 dias')
ON CONFLICT (resource_type) DO NOTHING;
