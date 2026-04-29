-- Performance indexes for hot query paths in agent / worker / inbox.
-- Additive and idempotent (IF NOT EXISTS). Safe to re-run.
--
-- NOTE: seller-scoped composite variants will be added in the multi-tenancy
-- migration once seller_key is backfilled across all core tables. Until then
-- we index on the columns that actually exist today.

-- recovery_leads: agent loads active leads grouped by status + agent.
CREATE INDEX IF NOT EXISTS idx_recovery_leads_status_agent
  ON recovery_leads (status, assigned_agent_id, created_at DESC)
  WHERE status NOT IN ('recovered', 'lost', 'archived');

-- conversations: inbox sorts by recency, filtered by status.
CREATE INDEX IF NOT EXISTS idx_conversations_status_last_message
  ON conversations (status, last_message_at DESC);

-- customers: email lookup is the slow path of upsertCustomer().
-- Lower() to match case-insensitive lookups in storage.
CREATE INDEX IF NOT EXISTS idx_customers_email_lower
  ON customers ((lower(email)));

-- follow_up_cadences: scheduler scans pending steps each tick.
-- Partial index keeps it tiny by excluding executed/skipped rows.
CREATE INDEX IF NOT EXISTS idx_follow_up_cadences_scheduled_pending
  ON follow_up_cadences (scheduled_at)
  WHERE executed_at IS NULL AND skipped_at IS NULL;

-- queue_jobs: worker claims due jobs in tight loops.
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status_run_at
  ON queue_jobs (status, run_at)
  WHERE status = 'scheduled';

-- queue_jobs: stale-job reset query scans processing jobs by start time.
CREATE INDEX IF NOT EXISTS idx_queue_jobs_processing_created
  ON queue_jobs (created_at)
  WHERE status = 'processing';

-- messages: per-customer history loads.
CREATE INDEX IF NOT EXISTS idx_messages_customer_created
  ON messages (customer_id, created_at DESC);

-- messages: conversation-scoped lookups (most-used UI query).
CREATE INDEX IF NOT EXISTS idx_messages_lead_record_created
  ON messages (lead_record_id, created_at DESC)
  WHERE lead_record_id IS NOT NULL;

-- payments: order-by-customer scans (recovery service).
CREATE INDEX IF NOT EXISTS idx_payments_customer_created
  ON payments (customer_id, created_at DESC);
