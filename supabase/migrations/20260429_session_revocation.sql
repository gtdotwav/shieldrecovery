-- Session revocation table (jti blacklist).
-- Allows administrators to forcibly invalidate a session before its TTL.

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti TEXT PRIMARY KEY,
  subject TEXT,
  reason TEXT,
  revoked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_expires
  ON revoked_sessions (expires_at);

-- Pruning helper: removes blacklist entries that have already expired
-- (i.e. the underlying token would no longer be accepted anyway).
CREATE OR REPLACE FUNCTION prune_revoked_sessions()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  removed INT;
BEGIN
  WITH deleted AS (
    DELETE FROM revoked_sessions
    WHERE expires_at < NOW()
    RETURNING jti
  )
  SELECT count(*)::INT INTO removed FROM deleted;
  RETURN removed;
END;
$$;
