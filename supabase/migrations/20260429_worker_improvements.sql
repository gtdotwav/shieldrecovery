-- Performance index for worker job claiming
-- Partial index on pending/scheduled jobs to avoid full table scans
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status_run_at
  ON queue_jobs(status, run_at)
  WHERE status IN ('pending', 'scheduled');

-- Index for dead job cleanup (failed jobs with exhausted attempts)
CREATE INDEX IF NOT EXISTS idx_queue_jobs_failed_cleanup
  ON queue_jobs(created_at)
  WHERE status = 'failed' AND attempts = 0;

-- Index for stale job detection (processing jobs by updated_at)
CREATE INDEX IF NOT EXISTS idx_queue_jobs_processing_updated
  ON queue_jobs(updated_at)
  WHERE status = 'processing';

-- Index for message idempotency lookup
CREATE INDEX IF NOT EXISTS idx_messages_provider_message_id
  ON messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
