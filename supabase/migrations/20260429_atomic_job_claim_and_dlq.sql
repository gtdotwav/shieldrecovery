-- Atomic job claim using FOR UPDATE SKIP LOCKED (Postgres-native concurrency).
-- Eliminates the SELECT-then-UPDATE race window in worker.claimDueQueueJobs
-- and reduces N round-trips to one.

CREATE OR REPLACE FUNCTION claim_queue_jobs_atomic(
  p_limit INT,
  p_run_until TIMESTAMPTZ DEFAULT NOW()
)
RETURNS SETOF queue_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT id
    FROM queue_jobs
    WHERE status = 'scheduled'
      AND run_at <= p_run_until
    ORDER BY run_at ASC
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE queue_jobs q
  SET status = 'processing',
      error = NULL,
      updated_at = NOW()
  FROM due
  WHERE q.id = due.id
  RETURNING q.*;
END;
$$;

COMMENT ON FUNCTION claim_queue_jobs_atomic IS
  'Atomically claims up to p_limit due jobs using SKIP LOCKED. ' ||
  'Caller is responsible for completeQueueJob / rescheduleQueueJobFailure.';

-- Dead Letter Queue archive: keeps a forensic copy before cleanup deletes them.
CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  original_job_id UUID NOT NULL,
  queue_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INT NOT NULL,
  last_error TEXT,
  failed_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_archived
  ON dead_letter_jobs (archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_job_type
  ON dead_letter_jobs (job_type, archived_at DESC);

-- Atomic archive + delete in one statement.
CREATE OR REPLACE FUNCTION archive_dead_jobs(p_cutoff TIMESTAMPTZ)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  archived_count INT;
BEGIN
  WITH dead AS (
    SELECT id, queue_name, job_type, payload, attempts, error, created_at
    FROM queue_jobs
    WHERE status = 'failed'
      AND attempts = 0
      AND created_at < p_cutoff
  ),
  inserted AS (
    INSERT INTO dead_letter_jobs
      (original_job_id, queue_name, job_type, payload, attempts, last_error, failed_at)
    SELECT id, queue_name, job_type, payload, attempts, error, created_at
    FROM dead
    ON CONFLICT DO NOTHING
    RETURNING original_job_id
  ),
  deleted AS (
    DELETE FROM queue_jobs
    WHERE id IN (SELECT original_job_id FROM inserted)
    RETURNING id
  )
  SELECT count(*)::INT INTO archived_count FROM deleted;

  RETURN archived_count;
END;
$$;

COMMENT ON FUNCTION archive_dead_jobs IS
  'Moves permanently-failed jobs (attempts=0, older than cutoff) into ' ||
  'dead_letter_jobs and deletes the originals. Returns the row count.';

-- Distributed rate-limit bucket: replaces the in-memory Map in /api/auth/token.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset
  ON rate_limit_buckets (reset_at);

-- Atomic increment + check.
-- Returns (allowed BOOL, current_count INT, reset_at TIMESTAMPTZ).
CREATE OR REPLACE FUNCTION bump_rate_limit(
  p_key TEXT,
  p_window_seconds INT,
  p_max_count INT
)
RETURNS TABLE(allowed BOOLEAN, current_count INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_existing rate_limit_buckets%ROWTYPE;
BEGIN
  SELECT * INTO v_existing FROM rate_limit_buckets WHERE bucket_key = p_key FOR UPDATE;

  IF NOT FOUND OR v_existing.reset_at < v_now THEN
    INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (bucket_key) DO UPDATE
    SET count = 1, reset_at = v_now + (p_window_seconds || ' seconds')::INTERVAL;

    RETURN QUERY SELECT TRUE, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL;
    RETURN;
  END IF;

  IF v_existing.count >= p_max_count THEN
    RETURN QUERY SELECT FALSE, v_existing.count, v_existing.reset_at;
    RETURN;
  END IF;

  UPDATE rate_limit_buckets
  SET count = count + 1
  WHERE bucket_key = p_key
  RETURNING count, reset_at INTO v_existing.count, v_existing.reset_at;

  RETURN QUERY SELECT TRUE, v_existing.count, v_existing.reset_at;
END;
$$;

COMMENT ON FUNCTION bump_rate_limit IS
  'Atomic rate-limit counter. Returns allowed=false once count >= max ' ||
  'until reset_at expires.';
