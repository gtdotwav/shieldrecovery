-- Soft-delete columns + universal audit log.
-- Additive migration. Application code can opt into soft-delete gradually.

-- ── Soft delete (deleted_at + deleted_by) ──────────────────────────────────

ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE recovery_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE recovery_leads ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes that exclude soft-deleted rows so existing queries stay fast.
CREATE INDEX IF NOT EXISTS idx_customers_alive
  ON customers (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recovery_leads_alive
  ON recovery_leads (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_alive
  ON payments (id)
  WHERE deleted_at IS NULL;

-- ── Audit trail (old/new values via triggers) ──────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE')),
  actor TEXT,
  request_id TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_keys TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_row
  ON audit_log (table_name, row_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON audit_log (actor, occurred_at DESC)
  WHERE actor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_recent
  ON audit_log (occurred_at DESC);

-- Generic trigger function: writes a row to audit_log for every change on
-- the host table. Application can set "audit.actor" + "audit.request_id" on
-- the connection so we attribute changes back to the user/cron run.
CREATE OR REPLACE FUNCTION fn_record_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor TEXT := current_setting('audit.actor', true);
  v_request_id TEXT := current_setting('audit.request_id', true);
  v_old JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  v_changed TEXT[] := '{}';
  v_action TEXT := TG_OP;
  v_row_id TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND v_old IS NOT NULL AND v_new IS NOT NULL THEN
    SELECT array_agg(key)
      INTO v_changed
      FROM jsonb_each(v_new)
      WHERE v_new->>key IS DISTINCT FROM v_old->>key;

    -- Detect soft-delete (deleted_at went from null → not null).
    IF v_old ? 'deleted_at' AND v_new ? 'deleted_at'
       AND v_old->'deleted_at' = 'null'::jsonb
       AND v_new->'deleted_at' IS NOT NULL
       AND v_new->'deleted_at' <> 'null'::jsonb THEN
      v_action := 'SOFT_DELETE';
    END IF;
  END IF;

  v_row_id := COALESCE(
    (CASE TG_OP WHEN 'DELETE' THEN v_old ELSE v_new END)->>'id',
    'unknown'
  );

  INSERT INTO audit_log
    (table_name, row_id, action, actor, request_id, old_values, new_values, changed_keys)
  VALUES
    (TG_TABLE_NAME, v_row_id, v_action, NULLIF(v_actor, ''), NULLIF(v_request_id, ''),
     v_old, v_new, v_changed);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach the trigger to the high-value tables. Other tables can be added
-- incrementally without redeploying this migration.
DROP TRIGGER IF EXISTS trg_audit_recovery_leads ON recovery_leads;
CREATE TRIGGER trg_audit_recovery_leads
  AFTER INSERT OR UPDATE OR DELETE ON recovery_leads
  FOR EACH ROW EXECUTE FUNCTION fn_record_audit_log();

DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_record_audit_log();

DROP TRIGGER IF EXISTS trg_audit_customers ON customers;
CREATE TRIGGER trg_audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION fn_record_audit_log();
