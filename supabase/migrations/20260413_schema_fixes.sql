-- =============================================================================
-- Schema Fixes — Production Performance
-- 2026-04-13
-- Adds missing indexes, updated_at column + trigger for webhook_events,
-- and partial indexes for worker/agent hot paths.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Index on messages.status for filtering by delivery status
--    Note: schema.sql defines messages_status_idx; this is a safety net
--    in case the base schema index was dropped or renamed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_status
  ON public.messages (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Composite index on messages(conversation_id, created_at DESC)
--    Speeds up conversation thread rendering (most recent messages first).
--    Note: schema.sql defines messages_conversation_created_at_idx;
--    this is a safety net with canonical naming.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add updated_at to webhook_events
--    Table was missing this column — needed for audit trail and
--    reprocessing tracking.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Composite index on recovery_leads(status, created_at DESC)
--    Used by dashboard queries that filter by status and sort by date.
--    Note: 20260408_schema_hardening.sql already creates
--    recovery_leads_status_created_idx with the same columns —
--    IF NOT EXISTS prevents duplication if this name is already taken.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recovery_leads_status_created
  ON public.recovery_leads (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Partial index on queue_jobs for worker processing
--    Workers only scan pending jobs — a partial index avoids scanning
--    completed/failed rows entirely.
--    Note: 20260408 has a full index on (status, run_at); this partial
--    index is strictly more efficient for the worker hot path.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status_run_at
  ON public.queue_jobs (status, run_at)
  WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Partial index on follow_up_cadences for agent processing
--    The agent queries pending cadences (not yet executed or skipped)
--    ordered by scheduled_at. This partial index covers that hot path.
--    Note: follow_up_cadences uses scheduled_at (not next_step_at) and
--    has no status column — "active" = executed_at IS NULL AND skipped_at IS NULL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cadences_status_next
  ON public.follow_up_cadences (scheduled_at)
  WHERE executed_at IS NULL AND skipped_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Apply updated_at trigger to webhook_events
--    Uses the same set_updated_at() function created in
--    20260408_schema_hardening.sql.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_webhook_events_updated_at ON public.webhook_events;
CREATE TRIGGER trg_webhook_events_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
