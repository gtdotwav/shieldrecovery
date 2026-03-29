-- Supabase Schema representing the Shield Recovery data model

-- Enable UUID extension if not already enabled (Supabase usually has it enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: customers
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gateway_customer_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  document TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: payments
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gateway_payment_id TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  failure_code TEXT,
  first_failure_at TIMESTAMP WITH TIME ZONE,
  recovered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: payment_attempts
CREATE TABLE payment_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  failure_reason TEXT,
  payment_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: webhook_events
CREATE TABLE webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  webhook_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT DEFAULT 'shield-gateway' NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false NOT NULL,
  duplicate BOOLEAN DEFAULT false NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Table: agents
CREATE TABLE agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  last_assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: recovery_leads
CREATE TABLE recovery_leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id TEXT UNIQUE NOT NULL,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  payment_value DECIMAL(12, 2) NOT NULL,
  product TEXT,
  failure_reason TEXT,
  status TEXT NOT NULL,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  recovered_at TIMESTAMP WITH TIME ZONE
);

-- Table: conversations
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_record_id UUID REFERENCES recovery_leads(id) ON DELETE SET NULL,
  lead_public_id TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX conversations_channel_contact_value_idx
  ON conversations(channel, contact_value);

CREATE INDEX conversations_last_message_at_idx
  ON conversations(last_message_at DESC);

-- Table: messages
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  lead_record_id UUID REFERENCES recovery_leads(id) ON DELETE SET NULL,
  lead_public_id TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  sender_name TEXT,
  sender_address TEXT NOT NULL,
  content TEXT NOT NULL,
  provider_message_id TEXT UNIQUE,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  metadata JSONB
);

CREATE INDEX messages_conversation_created_at_idx
  ON messages(conversation_id, created_at DESC);

CREATE INDEX messages_status_idx
  ON messages(status);

-- Table: queue_jobs
CREATE TABLE queue_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  queue_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 3 NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: system_logs
CREATE TABLE system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: calendar_notes
CREATE TABLE calendar_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  lane TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_by_email TEXT NOT NULL,
  created_by_role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX calendar_notes_date_idx
  ON calendar_notes(date DESC);

CREATE INDEX calendar_notes_lane_idx
  ON calendar_notes(lane);

-- Table: connection_settings
CREATE TABLE connection_settings (
  id TEXT PRIMARY KEY,
  app_base_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  webhook_tolerance_seconds INTEGER NOT NULL DEFAULT 300,
  whatsapp_provider TEXT NOT NULL DEFAULT 'cloud_api',
  whatsapp_api_base_url TEXT,
  whatsapp_access_token TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_business_account_id TEXT,
  whatsapp_webhook_verify_token TEXT,
  whatsapp_web_session_id TEXT,
  whatsapp_web_session_status TEXT NOT NULL DEFAULT 'disconnected',
  whatsapp_web_session_qr_code TEXT,
  whatsapp_web_session_phone TEXT,
  whatsapp_web_session_error TEXT,
  whatsapp_web_session_updated_at TIMESTAMP WITH TIME ZONE,
  email_provider TEXT NOT NULL DEFAULT 'sendgrid',
  email_api_key TEXT,
  email_from_address TEXT,
  crm_api_url TEXT,
  crm_api_key TEXT,
  openai_api_key TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: seller_admin_controls
CREATE TABLE seller_admin_controls (
  id TEXT PRIMARY KEY,
  seller_key TEXT UNIQUE NOT NULL,
  seller_name TEXT NOT NULL,
  seller_email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  recovery_target_percent DECIMAL(5, 2) NOT NULL DEFAULT 18,
  reported_recovery_rate_percent DECIMAL(5, 2),
  max_assigned_leads INTEGER NOT NULL DEFAULT 30,
  inbox_enabled BOOLEAN NOT NULL DEFAULT true,
  automations_enabled BOOLEAN NOT NULL DEFAULT true,
  autonomy_mode TEXT NOT NULL DEFAULT 'supervised',
  messaging_approach TEXT NOT NULL DEFAULT 'friendly',
  gateway_slug TEXT,
  checkout_url TEXT,
  checkout_api_key TEXT,
  notes TEXT,
  gateway_api_key TEXT,
  whitelabel_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX seller_admin_controls_name_idx
  ON seller_admin_controls(seller_name);

-- Table: seller_users
CREATE TABLE seller_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX seller_users_display_name_idx
  ON seller_users(display_name);

-- Table: seller_invites
CREATE TABLE seller_invites (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  suggested_display_name TEXT,
  agent_name TEXT,
  note TEXT,
  created_by_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX seller_invites_email_idx
  ON seller_invites(email);

CREATE INDEX seller_invites_status_idx
  ON seller_invites(status);

INSERT INTO connection_settings (
  id,
  app_base_url,
  webhook_secret,
  webhook_tolerance_seconds,
  whatsapp_provider,
  whatsapp_api_base_url,
  email_provider,
  updated_at
)
VALUES (
  'default',
  'http://127.0.0.1:3001',
  'shield_preview_secret',
  300,
  'cloud_api',
  'https://graph.facebook.com/v22.0',
  'sendgrid',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Table: whitelabel_profiles
CREATE TABLE whitelabel_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  gateway_provider TEXT NOT NULL DEFAULT 'custom',
  gateway_base_url TEXT DEFAULT '',
  gateway_docs_url TEXT DEFAULT '',
  gateway_webhook_path TEXT DEFAULT '',
  checkout_url TEXT DEFAULT '',
  checkout_api_key TEXT DEFAULT '',
  brand_accent TEXT DEFAULT '',
  brand_logo TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX whitelabel_profiles_slug_idx ON whitelabel_profiles(slug);
CREATE INDEX whitelabel_profiles_active_idx ON whitelabel_profiles(active);

-- Table: calls
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID,
  lead_id TEXT,
  customer_id UUID,
  agent_id UUID,
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_number TEXT,
  to_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMP WITH TIME ZONE,
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  ring_duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  recording_duration_seconds INTEGER,
  transcript TEXT,
  transcript_summary TEXT,
  outcome TEXT,
  outcome_notes TEXT,
  callback_scheduled_at TIMESTAMP WITH TIME ZONE,
  provider TEXT NOT NULL DEFAULT 'vapi',
  provider_call_id TEXT,
  provider_cost DECIMAL(10, 4),
  sentiment TEXT,
  copy TEXT,
  product TEXT,
  discount_percent DECIMAL(5, 2),
  coupon_code TEXT,
  chosen_payment_method TEXT,
  checkout_session_id TEXT,
  checkout_url TEXT,
  voice_tone TEXT,
  voice_gender TEXT,
  seller_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX calls_lead_id_idx ON calls(lead_id);
CREATE INDEX calls_status_idx ON calls(status);
CREATE INDEX calls_created_at_idx ON calls(created_at DESC);

-- Table: call_events
CREATE TABLE IF NOT EXISTS call_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX call_events_call_id_idx ON call_events(call_id);

-- Table: call_campaigns
CREATE TABLE IF NOT EXISTS call_campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  filter_criteria JSONB DEFAULT '{}'::jsonb,
  total_contacts INTEGER DEFAULT 0,
  completed_contacts INTEGER DEFAULT 0,
  successful_contacts INTEGER DEFAULT 0,
  created_by TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table: callcenter_settings
CREATE TABLE IF NOT EXISTS callcenter_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_key TEXT UNIQUE NOT NULL,
  voice_tone TEXT DEFAULT 'empathetic',
  voice_gender TEXT DEFAULT 'female',
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  coupon_code TEXT DEFAULT '',
  default_copy TEXT DEFAULT '',
  default_product TEXT DEFAULT '',
  provider TEXT DEFAULT 'vapi',
  max_calls_per_day INTEGER DEFAULT 50,
  auto_call_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX callcenter_settings_seller_key_idx ON callcenter_settings(seller_key);
