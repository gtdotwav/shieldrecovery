-- Whitelabel profiles table
CREATE TABLE IF NOT EXISTS whitelabel_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  gateway_provider TEXT NOT NULL DEFAULT 'custom',
  gateway_base_url TEXT DEFAULT '',
  gateway_docs_url TEXT DEFAULT '',
  gateway_webhook_path TEXT DEFAULT '',
  checkout_url TEXT DEFAULT '',
  checkout_api_key TEXT DEFAULT '',
  brand_accent TEXT DEFAULT '',
  brand_logo TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS whitelabel_profiles_slug_idx ON whitelabel_profiles(slug);
CREATE INDEX IF NOT EXISTS whitelabel_profiles_active_idx ON whitelabel_profiles(active);

-- Add whitelabel/gateway fields to seller_admin_controls
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS gateway_api_key TEXT;
ALTER TABLE seller_admin_controls ADD COLUMN IF NOT EXISTS whitelabel_id TEXT;
