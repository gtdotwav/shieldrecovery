-- Scope CFO conversations to seller
ALTER TABLE cfo_conversations ADD COLUMN IF NOT EXISTS seller_key TEXT;
CREATE INDEX IF NOT EXISTS idx_cfo_conversations_seller ON cfo_conversations (seller_key, updated_at DESC);
