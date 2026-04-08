-- =============================================================================
-- Schema Hardening Migration
-- 2026-04-08
-- Adds missing indexes, updated_at triggers, CHECK constraints, and foreign keys
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CRITICAL INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- payments indexes
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON payments(customer_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at DESC);

-- recovery_leads indexes
CREATE INDEX IF NOT EXISTS recovery_leads_status_idx ON recovery_leads(status);
CREATE INDEX IF NOT EXISTS recovery_leads_customer_id_idx ON recovery_leads(customer_id);
CREATE INDEX IF NOT EXISTS recovery_leads_assigned_agent_idx ON recovery_leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS recovery_leads_created_at_idx ON recovery_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS recovery_leads_status_created_idx ON recovery_leads(status, created_at DESC);

-- queue_jobs indexes
CREATE INDEX IF NOT EXISTS queue_jobs_status_run_at_idx ON queue_jobs(status, run_at);
CREATE INDEX IF NOT EXISTS queue_jobs_queue_name_idx ON queue_jobs(queue_name);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADD updated_at COLUMN TO TABLES MISSING IT
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. REUSABLE updated_at TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. APPLY updated_at TRIGGERS TO ALL RELEVANT TABLES
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl TEXT;
  trigger_name TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'customers',
      'payments',
      'recovery_leads',
      'conversations',
      'messages',
      'calendar_notes',
      'connection_settings',
      'seller_admin_controls',
      'seller_users',
      'seller_invites',
      'whitelabel_profiles',
      'calls',
      'call_campaigns',
      'callcenter_settings',
      'marketing_scenarios',
      'payment_attempts',
      'agents'
    ])
  LOOP
    trigger_name := 'trg_' || tbl || '_updated_at';
    -- Drop if exists, then create
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      trigger_name, tbl
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CHECK CONSTRAINTS ON STATUS COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────

-- recovery_leads.status
ALTER TABLE recovery_leads DROP CONSTRAINT IF EXISTS recovery_leads_status_check;
ALTER TABLE recovery_leads ADD CONSTRAINT recovery_leads_status_check
  CHECK (status IN ('NEW_RECOVERY', 'CONTACTING', 'WAITING_CUSTOMER', 'RECOVERED', 'LOST', 'EXPIRED'));

-- conversations.status
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('open', 'closed', 'archived', 'pending'));

-- queue_jobs.status
ALTER TABLE queue_jobs DROP CONSTRAINT IF EXISTS queue_jobs_status_check;
ALTER TABLE queue_jobs ADD CONSTRAINT queue_jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'dead', 'scheduled', 'processed'));

-- messages.direction
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_direction_check;
ALTER TABLE messages ADD CONSTRAINT messages_direction_check
  CHECK (direction IN ('inbound', 'outbound'));

-- messages.status
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check
  CHECK (status IN ('queued', 'received', 'sent', 'delivered', 'read', 'failed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FOREIGN KEYS FOR calls TABLE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE calls ADD CONSTRAINT calls_customer_id_fk
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE calls ADD CONSTRAINT calls_agent_id_fk
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
