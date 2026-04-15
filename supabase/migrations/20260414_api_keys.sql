-- API Keys for programmatic SDK access
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  seller_key TEXT,
  role TEXT NOT NULL DEFAULT 'seller',
  scopes TEXT[] DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX api_keys_prefix_idx ON api_keys(key_prefix);
CREATE INDEX api_keys_seller_key_idx ON api_keys(seller_key);
CREATE INDEX api_keys_active_idx ON api_keys(active) WHERE active = true;
