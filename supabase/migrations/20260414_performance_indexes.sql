-- Performance indexes for common query patterns
-- Safe: all use IF NOT EXISTS

-- payments: customer-scoped lookups (used by recovery service)
CREATE INDEX IF NOT EXISTS idx_payments_customer_status
  ON payments (customer_id, status, created_at DESC);

-- webhook_events: unprocessed event processing
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON webhook_events (processed, created_at DESC)
  WHERE processed = false;

-- messages: status-based queue processing
CREATE INDEX IF NOT EXISTS idx_messages_status_created
  ON messages (status, created_at ASC)
  WHERE status = 'queued';

-- calls: seller-scoped dashboard queries
CREATE INDEX IF NOT EXISTS idx_calls_seller_status
  ON calls (seller_key, status, created_at DESC);
