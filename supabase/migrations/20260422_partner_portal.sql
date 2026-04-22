-- ============================================================================
-- Partner Portal: external dashboard for white-label gateway partners
-- ============================================================================

-- Partner profiles (the gateway companies that integrate with PagRecovery)
CREATE TABLE IF NOT EXISTS partner_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT DEFAULT '',
  brand_accent TEXT DEFAULT '#6366f1',
  brand_logo TEXT DEFAULT '',
  webhook_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS partner_profiles_slug_idx ON partner_profiles(slug);
CREATE INDEX IF NOT EXISTS partner_profiles_active_idx ON partner_profiles(active) WHERE active = true;

-- Partner tenants (merchants/sellers under each partner)
CREATE TABLE IF NOT EXISTS partner_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  tenant_key TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT DEFAULT '',
  gateway_slug TEXT DEFAULT 'partner',
  active BOOLEAN NOT NULL DEFAULT true,
  api_key_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(partner_id, tenant_key)
);

CREATE INDEX IF NOT EXISTS partner_tenants_partner_id_idx ON partner_tenants(partner_id);
CREATE INDEX IF NOT EXISTS partner_tenants_tenant_key_idx ON partner_tenants(tenant_key);

-- Partner users (login credentials for the partner portal)
CREATE TABLE IF NOT EXISTS partner_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS partner_users_partner_id_idx ON partner_users(partner_id);
CREATE INDEX IF NOT EXISTS partner_users_email_idx ON partner_users(email);
