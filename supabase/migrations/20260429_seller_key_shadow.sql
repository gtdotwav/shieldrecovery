-- Multi-tenancy phase 1 — additive shadow column.
-- Adds NULLABLE seller_key to all tenant-scoped tables so application code
-- can begin writing it on inserts/updates. No backfill, no NOT NULL, no RLS
-- yet — those land in phase 2/3 after the value is populated for every row.
--
-- Rollout plan:
--   1. (this file)   add nullable column + helper indexes
--   2. application   start writing seller_key on every insert
--   3. backfill      reverse-engineer seller_key from existing relations
--   4. ALTER TABLE … ALTER COLUMN seller_key SET NOT NULL
--   5. enable RLS    policies that scope reads/writes by seller_key
--
-- Until step 4 lands, queries MUST tolerate NULL values — i.e. do not add
-- WHERE seller_key = ? without an OR seller_key IS NULL guard.

ALTER TABLE recovery_leads ADD COLUMN IF NOT EXISTS seller_key TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS seller_key TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS seller_key TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS seller_key TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS seller_key TEXT;
ALTER TABLE queue_jobs ADD COLUMN IF NOT EXISTS seller_key TEXT;
ALTER TABLE follow_up_cadences ADD COLUMN IF NOT EXISTS seller_key TEXT;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS seller_key TEXT;

-- Helper indexes. Composite with status/run_at to match the most common
-- agent / worker queries once the column is populated.
CREATE INDEX IF NOT EXISTS idx_recovery_leads_seller_key
  ON recovery_leads (seller_key)
  WHERE seller_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_seller_key
  ON conversations (seller_key)
  WHERE seller_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_seller_key
  ON payments (seller_key)
  WHERE seller_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_seller_key
  ON messages (seller_key)
  WHERE seller_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_queue_jobs_seller_key_status
  ON queue_jobs (seller_key, status)
  WHERE seller_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_follow_up_cadences_seller_key
  ON follow_up_cadences (seller_key, scheduled_at)
  WHERE seller_key IS NOT NULL AND executed_at IS NULL AND skipped_at IS NULL;

-- A dedicated backfill helper that infers seller_key from the relation chain
-- (lead → assigned_agent_id → agents.seller_key). Idempotent; safe to re-run.
CREATE OR REPLACE FUNCTION backfill_seller_key_from_agents()
RETURNS TABLE(table_name TEXT, updated INT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH lead_updates AS (
    UPDATE recovery_leads l
    SET seller_key = a.seller_key
    FROM agents a
    WHERE l.assigned_agent_id = a.id
      AND l.seller_key IS NULL
      AND a.seller_key IS NOT NULL
    RETURNING l.id
  ),
  conv_updates AS (
    UPDATE conversations c
    SET seller_key = l.seller_key
    FROM recovery_leads l
    WHERE c.lead_record_id = l.id
      AND c.seller_key IS NULL
      AND l.seller_key IS NOT NULL
    RETURNING c.id
  ),
  msg_updates AS (
    UPDATE messages m
    SET seller_key = c.seller_key
    FROM conversations c
    WHERE m.conversation_id = c.id
      AND m.seller_key IS NULL
      AND c.seller_key IS NOT NULL
    RETURNING m.id
  ),
  payment_updates AS (
    UPDATE payments p
    SET seller_key = l.seller_key
    FROM recovery_leads l
    WHERE l.payment_id = p.id
      AND p.seller_key IS NULL
      AND l.seller_key IS NOT NULL
    RETURNING p.id
  ),
  customer_updates AS (
    UPDATE customers cu
    SET seller_key = l.seller_key
    FROM recovery_leads l
    WHERE l.customer_id = cu.id
      AND cu.seller_key IS NULL
      AND l.seller_key IS NOT NULL
    RETURNING cu.id
  )
  SELECT 'recovery_leads', COUNT(*)::INT FROM lead_updates
  UNION ALL SELECT 'conversations', COUNT(*)::INT FROM conv_updates
  UNION ALL SELECT 'messages', COUNT(*)::INT FROM msg_updates
  UNION ALL SELECT 'payments', COUNT(*)::INT FROM payment_updates
  UNION ALL SELECT 'customers', COUNT(*)::INT FROM customer_updates;
END;
$$;

COMMENT ON FUNCTION backfill_seller_key_from_agents IS
  'Phase 2 of multi-tenancy rollout. Run repeatedly until every table reports 0.';
