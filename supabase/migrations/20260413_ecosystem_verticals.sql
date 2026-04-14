-- =============================================
-- Ecosystem Verticals — Schema
-- Cart Abandonment, Subscriptions/Dunning, Upsell/Cross-sell,
-- Reactivation, Commerce AI, Preventive Billing, Negativation,
-- Payment Score, Reconciliation, Outbound Sales, Accountant,
-- Anticipation
-- =============================================

-- 1. Cart Abandonment
CREATE TABLE IF NOT EXISTS cart_abandonments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cart_total DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  checkout_url TEXT,
  abandoned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'contacting', 'recovered', 'lost')),
  recovered_at TIMESTAMPTZ,
  recovered_value DECIMAL(12,2),
  contact_attempts INTEGER NOT NULL DEFAULT 0,
  last_contact_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_abandonments_seller ON cart_abandonments(seller_key);
CREATE INDEX IF NOT EXISTS idx_cart_abandonments_status ON cart_abandonments(status);
CREATE INDEX IF NOT EXISTS idx_cart_abandonments_session ON cart_abandonments(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_abandonments_abandoned ON cart_abandonments(abandoned_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_abandonments_customer_email ON cart_abandonments(customer_email);

-- 2. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  plan_name TEXT NOT NULL,
  plan_amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  interval TEXT NOT NULL CHECK (interval IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'trial')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  next_billing_at TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  failed_payments_count INTEGER NOT NULL DEFAULT 0,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_periods INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  gateway_subscription_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_seller ON subscriptions(seller_key);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway ON subscriptions(gateway_subscription_id);

-- 3. Dunning Rules
CREATE TABLE IF NOT EXISTS dunning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_rules_seller ON dunning_rules(seller_key);

-- 4. Subscription Invoices
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  seller_key TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  due_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  payment_method TEXT,
  gateway_payment_id TEXT,
  dunning_step INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_seller ON subscription_invoices(seller_key);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_status ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_due ON subscription_invoices(due_at);

-- 5. Upsell Offers
CREATE TABLE IF NOT EXISTS upsell_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('post_payment', 'post_recovery', 'cart_abandonment', 'reactivation', 'manual')),
  trigger_event_id TEXT,
  original_product_name TEXT,
  original_product_value DECIMAL(12,2),
  offer_product_name TEXT NOT NULL,
  offer_product_value DECIMAL(12,2) NOT NULL,
  discount_pct DECIMAL(5,2),
  final_value DECIMAL(12,2) NOT NULL,
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'offered', 'accepted', 'declined', 'expired')),
  offered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  channel TEXT,
  message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upsell_offers_seller ON upsell_offers(seller_key);
CREATE INDEX IF NOT EXISTS idx_upsell_offers_customer ON upsell_offers(customer_id);
CREATE INDEX IF NOT EXISTS idx_upsell_offers_status ON upsell_offers(status);
CREATE INDEX IF NOT EXISTS idx_upsell_offers_trigger ON upsell_offers(trigger);

-- 6. Upsell Rules
CREATE TABLE IF NOT EXISTS upsell_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('post_payment', 'post_recovery', 'cart_abandonment', 'reactivation', 'manual')),
  source_product_pattern TEXT,
  offer_product_name TEXT NOT NULL,
  offer_product_value DECIMAL(12,2) NOT NULL,
  discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  template_slug TEXT,
  max_offers_per_customer INTEGER NOT NULL DEFAULT 3,
  active BOOLEAN NOT NULL DEFAULT true,
  total_offered INTEGER NOT NULL DEFAULT 0,
  total_accepted INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upsell_rules_seller ON upsell_rules(seller_key);
CREATE INDEX IF NOT EXISTS idx_upsell_rules_trigger ON upsell_rules(trigger);

-- 7. Reactivation Campaigns
CREATE TABLE IF NOT EXISTS reactivation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  inactive_days_threshold INTEGER NOT NULL DEFAULT 90,
  target_segment TEXT,
  offer_description TEXT,
  discount_pct DECIMAL(5,2),
  channels TEXT[] NOT NULL DEFAULT ARRAY['whatsapp'],
  template_slugs JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_targeted INTEGER NOT NULL DEFAULT 0,
  total_contacted INTEGER NOT NULL DEFAULT 0,
  total_reactivated INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reactivation_campaigns_seller ON reactivation_campaigns(seller_key);
CREATE INDEX IF NOT EXISTS idx_reactivation_campaigns_status ON reactivation_campaigns(status);

-- 8. Reactivation Contacts
CREATE TABLE IF NOT EXISTS reactivation_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES reactivation_campaigns(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  last_purchase_at TIMESTAMPTZ NOT NULL,
  last_purchase_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_historical_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'reactivated', 'declined', 'unresponsive')),
  contacted_at TIMESTAMPTZ,
  reactivated_at TIMESTAMPTZ,
  reactivated_value DECIMAL(12,2),
  channel TEXT,
  message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reactivation_contacts_campaign ON reactivation_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_contacts_status ON reactivation_contacts(status);
CREATE INDEX IF NOT EXISTS idx_reactivation_contacts_customer ON reactivation_contacts(customer_id);

-- 9. Commerce Sessions (Conversational Sales)
CREATE TABLE IF NOT EXISTS commerce_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'browsing' CHECK (status IN ('browsing', 'interested', 'negotiating', 'checkout', 'purchased', 'abandoned')),
  catalog_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cart_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_applied DECIMAL(12,2),
  final_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  checkout_url TEXT,
  checkout_session_id TEXT,
  conversation_id UUID,
  ai_messages_count INTEGER NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ,
  purchased_value DECIMAL(12,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_sessions_seller ON commerce_sessions(seller_key);
CREATE INDEX IF NOT EXISTS idx_commerce_sessions_status ON commerce_sessions(status);
CREATE INDEX IF NOT EXISTS idx_commerce_sessions_phone ON commerce_sessions(customer_phone);

-- 10. Commerce Catalogs
CREATE TABLE IF NOT EXISTS commerce_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_catalogs_seller ON commerce_catalogs(seller_key);

-- 11. Preventive Rules (Billing Reminders)
CREATE TABLE IF NOT EXISTS preventive_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  name TEXT NOT NULL,
  days_before_due INTEGER[] NOT NULL DEFAULT ARRAY[3, 1, 0],
  channels TEXT[] NOT NULL DEFAULT ARRAY['whatsapp'],
  template_slugs JSONB NOT NULL DEFAULT '{}'::jsonb,
  include_payment_link BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_paid_before_due INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preventive_rules_seller ON preventive_rules(seller_key);

-- 12. Preventive Reminders
CREATE TABLE IF NOT EXISTS preventive_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES preventive_rules(id) ON DELETE CASCADE,
  seller_key TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  invoice_id TEXT,
  amount DECIMAL(12,2) NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('pre_due', 'due_day', 'post_due')),
  days_from_due INTEGER NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'paid_before_due', 'failed')),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preventive_reminders_rule ON preventive_reminders(rule_id);
CREATE INDEX IF NOT EXISTS idx_preventive_reminders_seller ON preventive_reminders(seller_key);
CREATE INDEX IF NOT EXISTS idx_preventive_reminders_status ON preventive_reminders(status);
CREATE INDEX IF NOT EXISTS idx_preventive_reminders_due ON preventive_reminders(due_at);

-- 13. Negativation Records
CREATE TABLE IF NOT EXISTS negativations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  debt_amount DECIMAL(12,2) NOT NULL,
  original_due_at TIMESTAMPTZ NOT NULL,
  registered_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  bureau TEXT NOT NULL DEFAULT 'serasa' CHECK (bureau IN ('serasa', 'spc', 'boa_vista', 'cartorio')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'paid', 'removed', 'disputed')),
  protocol_number TEXT,
  extrajudicial_notice_id UUID,
  recovery_lead_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negativations_seller ON negativations(seller_key);
CREATE INDEX IF NOT EXISTS idx_negativations_customer ON negativations(customer_id);
CREATE INDEX IF NOT EXISTS idx_negativations_document ON negativations(customer_document);
CREATE INDEX IF NOT EXISTS idx_negativations_status ON negativations(status);
CREATE INDEX IF NOT EXISTS idx_negativations_bureau ON negativations(bureau);

-- 14. Extrajudicial Notices
CREATE TABLE IF NOT EXISTS extrajudicial_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  customer_address TEXT,
  debt_amount DECIMAL(12,2) NOT NULL,
  debt_description TEXT NOT NULL,
  original_due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'acknowledged', 'expired')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  delivery_method TEXT NOT NULL DEFAULT 'digital' CHECK (delivery_method IN ('digital', 'postal', 'registered_mail')),
  tracking_code TEXT,
  negativation_id UUID REFERENCES negativations(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extrajudicial_notices_seller ON extrajudicial_notices(seller_key);
CREATE INDEX IF NOT EXISTS idx_extrajudicial_notices_customer ON extrajudicial_notices(customer_id);
CREATE INDEX IF NOT EXISTS idx_extrajudicial_notices_status ON extrajudicial_notices(status);
CREATE INDEX IF NOT EXISTS idx_extrajudicial_notices_negativation ON extrajudicial_notices(negativation_id);

-- 15. Payment Scores
CREATE TABLE IF NOT EXISTS payment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  customer_document TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  total_transactions INTEGER NOT NULL DEFAULT 0,
  successful_transactions INTEGER NOT NULL DEFAULT 0,
  failed_transactions INTEGER NOT NULL DEFAULT 0,
  recovered_transactions INTEGER NOT NULL DEFAULT 0,
  average_payment_time_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  average_ticket DECIMAL(12,2) NOT NULL DEFAULT 0,
  preferred_payment_method TEXT,
  last_transaction_at TIMESTAMPTZ,
  first_transaction_at TIMESTAMPTZ,
  chargeback_count INTEGER NOT NULL DEFAULT 0,
  refund_count INTEGER NOT NULL DEFAULT 0,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_scores_customer ON payment_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_scores_email ON payment_scores(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_scores_document ON payment_scores(customer_document);
CREATE INDEX IF NOT EXISTS idx_payment_scores_risk ON payment_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_payment_scores_score ON payment_scores(score DESC);

-- 16. Reconciliation Reports
CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_charges_sent DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_payments_received DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_gateway_fees DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_platform_fees DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  unmatched_charges INTEGER NOT NULL DEFAULT 0,
  unmatched_payments INTEGER NOT NULL DEFAULT 0,
  discrepancy_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'has_discrepancies')),
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_seller ON reconciliation_reports(seller_key);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_period ON reconciliation_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_status ON reconciliation_reports(status);

-- 17. Outbound Sales Campaigns
CREATE TABLE IF NOT EXISTS outbound_sales_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  product_name TEXT NOT NULL,
  product_value DECIMAL(12,2) NOT NULL,
  discount_pct DECIMAL(5,2),
  channels TEXT[] NOT NULL DEFAULT ARRAY['whatsapp'],
  voice_tone TEXT CHECK (voice_tone IN ('empathetic', 'professional', 'urgent', 'friendly', 'direct')),
  voice_gender TEXT CHECK (voice_gender IN ('female', 'male')),
  target_segment TEXT,
  script_prompt TEXT NOT NULL,
  max_contacts_per_day INTEGER NOT NULL DEFAULT 100,
  total_contacted INTEGER NOT NULL DEFAULT 0,
  total_interested INTEGER NOT NULL DEFAULT 0,
  total_sold INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_seller ON outbound_sales_campaigns(seller_key);
CREATE INDEX IF NOT EXISTS idx_outbound_campaigns_status ON outbound_sales_campaigns(status);

-- 18. Outbound Sales Contacts
CREATE TABLE IF NOT EXISTS outbound_sales_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES outbound_sales_campaigns(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'interested', 'sold', 'declined', 'no_answer')),
  contacted_at TIMESTAMPTZ,
  channel TEXT,
  call_id UUID,
  message_id TEXT,
  checkout_url TEXT,
  purchased_at TIMESTAMPTZ,
  purchased_value DECIMAL(12,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_contacts_campaign ON outbound_sales_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outbound_contacts_status ON outbound_sales_contacts(status);

-- 19. Accountant Profiles
CREATE TABLE IF NOT EXISTS accountant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  document TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  seller_key TEXT NOT NULL,
  commission_pct DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  total_clients INTEGER NOT NULL DEFAULT 0,
  active_clients INTEGER NOT NULL DEFAULT 0,
  total_recovered_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_commission_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accountant_profiles_document ON accountant_profiles(document);
CREATE INDEX IF NOT EXISTS idx_accountant_profiles_seller ON accountant_profiles(seller_key);
CREATE INDEX IF NOT EXISTS idx_accountant_profiles_email ON accountant_profiles(email);

-- 20. Accountant Clients
CREATE TABLE IF NOT EXISTS accountant_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id UUID NOT NULL REFERENCES accountant_profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_document TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  seller_key TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  total_debt DECIMAL(12,2) NOT NULL DEFAULT 0,
  recovered_debt DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accountant_clients_accountant ON accountant_clients(accountant_id);
CREATE INDEX IF NOT EXISTS idx_accountant_clients_seller ON accountant_clients(seller_key);
CREATE INDEX IF NOT EXISTS idx_accountant_clients_document ON accountant_clients(client_document);

-- 21. Anticipation Requests
CREATE TABLE IF NOT EXISTS anticipation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  requested_amount DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2),
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  spread_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  receivables_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'settled', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  receivable_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anticipation_requests_seller ON anticipation_requests(seller_key);
CREATE INDEX IF NOT EXISTS idx_anticipation_requests_status ON anticipation_requests(status);
