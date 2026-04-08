-- =============================================
-- Messaging Platform Upgrades — Schema
-- Phase 1: Opt-out, Frequency Capping, Message Lifecycle,
--           Multi-channel, Templates, A/B Testing, Funnel
-- =============================================

-- 1. Opt-out / Blacklist table (LGPD compliance)
CREATE TABLE IF NOT EXISTS contact_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'voice', 'all')),
  contact_value TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'customer_requested',
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'inbound_keyword',
  seller_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_opt_outs_channel_contact
  ON contact_opt_outs(channel, contact_value);
CREATE INDEX IF NOT EXISTS idx_opt_outs_contact
  ON contact_opt_outs(contact_value);

-- 2. Contact frequency tracking (frequency capping)
CREATE TABLE IF NOT EXISTS contact_frequency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_value TEXT NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  seller_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_freq_log_contact_sent
  ON contact_frequency_log(contact_value, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_freq_log_contact_channel
  ON contact_frequency_log(contact_value, channel, sent_at DESC);

-- 3. Message lifecycle — add delivery tracking columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_status TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_channel TEXT;

-- 4. Message templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'recovery',
  vertical TEXT NOT NULL DEFAULT 'general',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  subject TEXT,
  body_whatsapp TEXT NOT NULL,
  body_sms TEXT,
  body_email_html TEXT,
  body_email_text TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  seller_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_vertical ON message_templates(vertical);
CREATE INDEX IF NOT EXISTS idx_templates_seller ON message_templates(seller_key);

-- 5. A/B test experiments
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'archived')),
  template_a_id UUID NOT NULL REFERENCES message_templates(id),
  template_b_id UUID NOT NULL REFERENCES message_templates(id),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  seller_key TEXT,
  total_sent_a INTEGER NOT NULL DEFAULT 0,
  total_sent_b INTEGER NOT NULL DEFAULT 0,
  total_delivered_a INTEGER NOT NULL DEFAULT 0,
  total_delivered_b INTEGER NOT NULL DEFAULT 0,
  total_clicked_a INTEGER NOT NULL DEFAULT 0,
  total_clicked_b INTEGER NOT NULL DEFAULT 0,
  total_converted_a INTEGER NOT NULL DEFAULT 0,
  total_converted_b INTEGER NOT NULL DEFAULT 0,
  winner TEXT CHECK (winner IN ('a', 'b', 'tie', NULL)),
  confidence_pct DECIMAL(5,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);

-- 6. A/B test assignments (which variant each contact received)
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  contact_value TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  delivered BOOLEAN NOT NULL DEFAULT false,
  clicked BOOLEAN NOT NULL DEFAULT false,
  converted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_assignments_test ON ab_test_assignments(ab_test_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_assignments_unique
  ON ab_test_assignments(ab_test_id, contact_value);

-- 7. Recovery funnel snapshots (daily aggregation)
CREATE TABLE IF NOT EXISTS recovery_funnel_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  seller_key TEXT,
  channel TEXT NOT NULL DEFAULT 'all',
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_read INTEGER NOT NULL DEFAULT 0,
  total_clicked INTEGER NOT NULL DEFAULT 0,
  total_converted INTEGER NOT NULL DEFAULT 0,
  total_opted_out INTEGER NOT NULL DEFAULT 0,
  total_revenue_recovered DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_date_seller_channel
  ON recovery_funnel_snapshots(snapshot_date, seller_key, channel);

-- 8. Frequency capping config per seller (extends seller_admin_controls)
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS max_contacts_per_lead_per_week INTEGER DEFAULT 5;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS max_contacts_per_lead_per_day INTEGER DEFAULT 2;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS sms_provider TEXT DEFAULT 'twilio';
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS sms_api_key TEXT;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS sms_from_number TEXT;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS email_recovery_enabled BOOLEAN DEFAULT false;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS preferred_channels TEXT[] DEFAULT ARRAY['whatsapp'];
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS ai_negotiation_enabled BOOLEAN DEFAULT false;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS ai_max_discount_pct DECIMAL(5,2) DEFAULT 15;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS ai_negotiation_strategy TEXT DEFAULT 'progressive';

-- 9. Follow-up cadences — add channel fallback tracking
ALTER TABLE follow_up_cadences ADD COLUMN IF NOT EXISTS fallback_channel TEXT;
ALTER TABLE follow_up_cadences ADD COLUMN IF NOT EXISTS fallback_executed_at TIMESTAMPTZ;
ALTER TABLE follow_up_cadences ADD COLUMN IF NOT EXISTS fallback_message_id UUID;
ALTER TABLE follow_up_cadences ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES message_templates(id);
ALTER TABLE follow_up_cadences ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES ab_tests(id);
ALTER TABLE follow_up_cadences ADD COLUMN IF NOT EXISTS ab_variant TEXT;

-- 10. Seed default recovery templates
INSERT INTO message_templates (name, slug, category, vertical, channel, body_whatsapp, body_sms, body_email_text, variables)
VALUES
  ('Primeiro contato — E-commerce', 'first-contact-ecommerce', 'recovery', 'ecommerce', 'whatsapp',
   'Oi {{customer_name}}, seu pedido de {{product}} no valor de {{amount}} esta pendente. Finalize aqui embaixo.',
   '{{customer_name}}, pedido {{product}} pendente ({{amount}}). Link: {{payment_url}}',
   '{{customer_name}}, seu pedido de {{product}} no valor de {{amount}} está pendente. Clique aqui para finalizar: {{payment_url}}',
   '["customer_name", "product", "amount", "payment_url"]'::jsonb),

  ('Lembrete gentil — Geral', 'gentle-reminder-general', 'recovery', 'general', 'whatsapp',
   'Oi {{customer_name}}, passando pra lembrar que o pagamento de {{amount}} continua disponivel aqui embaixo. Sem pressa.',
   '{{customer_name}}, lembrete: pagamento {{amount}} pendente. Link: {{payment_url}}',
   '{{customer_name}}, passando para lembrar que o pagamento de {{amount}} está disponível. Finalize aqui: {{payment_url}}',
   '["customer_name", "amount", "payment_url"]'::jsonb),

  ('Urgencia — E-commerce', 'urgency-ecommerce', 'recovery', 'ecommerce', 'whatsapp',
   '{{customer_name}}, o estoque do {{product}} esta acabando. Garanta o seu finalizando o pagamento aqui embaixo.',
   '{{customer_name}}, estoque {{product}} acabando! Finalize: {{payment_url}}',
   '{{customer_name}}, o estoque de {{product}} está se esgotando. Finalize agora: {{payment_url}}',
   '["customer_name", "product", "payment_url"]'::jsonb),

  ('Alternativa de pagamento', 'payment-alternative', 'recovery', 'general', 'whatsapp',
   'Oi {{customer_name}}, se preferir outra forma de pagamento (PIX, cartao ou boleto), e so me avisar aqui que gero um novo link.',
   '{{customer_name}}, quer pagar de outra forma? Responda e geramos novo link.',
   '{{customer_name}}, se preferir outra forma de pagamento, responda este email.',
   '["customer_name"]'::jsonb),

  ('Ultimo contato', 'last-chance', 'recovery', 'general', 'whatsapp',
   '{{customer_name}}, essa e a ultima vez que entro em contato sobre o pagamento de {{amount}}. O link fica aqui embaixo se quiser finalizar.',
   '{{customer_name}}, ultimo lembrete: {{amount}} pendente. Link: {{payment_url}}',
   '{{customer_name}}, este é nosso último lembrete. O link para pagamento de {{amount}} está aqui: {{payment_url}}',
   '["customer_name", "amount", "payment_url"]'::jsonb),

  ('Primeiro contato — SaaS', 'first-contact-saas', 'recovery', 'saas', 'whatsapp',
   'Oi {{customer_name}}, a renovacao de {{product}} nao foi processada. Finalize aqui embaixo para nao perder acesso.',
   '{{customer_name}}, renovacao {{product}} pendente. Link: {{payment_url}}',
   '{{customer_name}}, a renovação de {{product}} está pendente. Finalize para manter seu acesso: {{payment_url}}',
   '["customer_name", "product", "payment_url"]'::jsonb),

  ('Primeiro contato — Infoproduto', 'first-contact-infoproduct', 'recovery', 'infoproduct', 'whatsapp',
   'Oi {{customer_name}}, vi que a compra de {{product}} ficou pendente. O acesso esta pronto — e so finalizar o pagamento aqui embaixo.',
   '{{customer_name}}, acesso a {{product}} pronto! Finalize: {{payment_url}}',
   '{{customer_name}}, sua compra de {{product}} está pendente. Finalize e libere seu acesso: {{payment_url}}',
   '["customer_name", "product", "payment_url"]'::jsonb),

  ('Desconto progressivo', 'discount-offer', 'recovery', 'general', 'whatsapp',
   'Oi {{customer_name}}, como cortesia, estou oferecendo {{discount_pct}}% de desconto no pagamento de {{product}}. Aproveite aqui embaixo.',
   '{{customer_name}}, {{discount_pct}}% OFF em {{product}}! Link: {{payment_url}}',
   '{{customer_name}}, como cortesia oferecemos {{discount_pct}}% de desconto em {{product}}. Finalize aqui: {{payment_url}}',
   '["customer_name", "product", "discount_pct", "payment_url"]'::jsonb),

  ('Pos-chamada — Checkout', 'post-call-checkout', 'recovery', 'general', 'whatsapp',
   'Oi {{customer_name}}, conforme conversamos, segue o link de pagamento via {{payment_method}}. Qualquer duvida, estou aqui.',
   '{{customer_name}}, link de pagamento conforme combinado: {{payment_url}}',
   '{{customer_name}}, conforme nossa conversa, segue o link de pagamento: {{payment_url}}',
   '["customer_name", "payment_method", "payment_url"]'::jsonb),

  ('Reengajamento — 48h', 'reengagement-48h', 'recovery', 'general', 'whatsapp',
   'Oi {{customer_name}}, tudo bem? O pagamento de {{amount}} ainda esta disponivel. Posso ajudar com alguma duvida?',
   '{{customer_name}}, pagamento {{amount}} disponivel. Precisa de ajuda? Link: {{payment_url}}',
   '{{customer_name}}, o pagamento de {{amount}} ainda está disponível. Alguma dúvida? {{payment_url}}',
   '["customer_name", "amount", "payment_url"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
