-- ============================================================
-- PagRecovery Tracking & Attribution System
-- Native UTM tracking, campaign management, short links,
-- and revenue attribution across the entire ecosystem.
-- ============================================================

-- ── Tracking campaigns (seller-defined UTM presets) ──────────

CREATE TABLE IF NOT EXISTS tracking_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  name TEXT NOT NULL,

  -- UTM preset
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_content TEXT,
  utm_term TEXT,

  -- Ad spend (cents)
  cost_cents BIGINT DEFAULT 0,

  -- Aggregated performance (updated by daily stats job)
  total_clicks BIGINT DEFAULT 0,
  total_unique_visitors BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_revenue_cents BIGINT DEFAULT 0,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_campaigns_seller ON tracking_campaigns (seller_key);
CREATE INDEX IF NOT EXISTS idx_tracking_campaigns_active ON tracking_campaigns (seller_key, active) WHERE active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_campaigns_utm ON tracking_campaigns (seller_key, utm_source, utm_medium, utm_campaign) WHERE active = true;

-- ── Tracking links (short URLs with baked-in UTM) ────────────

CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  campaign_id UUID REFERENCES tracking_campaigns(id) ON DELETE SET NULL,

  short_code TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,

  -- UTM override (if null, inherits from campaign)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  label TEXT,

  -- Stats
  total_clicks BIGINT DEFAULT 0,
  total_unique_clicks BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,

  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_seller ON tracking_links (seller_key);
CREATE INDEX IF NOT EXISTS idx_tracking_links_campaign ON tracking_links (campaign_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links (short_code);

-- ── Tracking events (every click, page view, conversion) ─────

CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'link_click', 'checkout_start',
    'payment_completed', 'recovery_completed',
    'cart_recovered', 'upsell_accepted',
    'reactivation_completed', 'subscription_renewed'
  )),

  -- UTM parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Session / visitor tracking
  session_id TEXT,
  visitor_id TEXT,

  -- Attribution links
  customer_id UUID,
  payment_id UUID,
  lead_id TEXT,
  link_id UUID REFERENCES tracking_links(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES tracking_campaigns(id) ON DELETE SET NULL,

  -- Context
  referrer_url TEXT,
  landing_page TEXT,
  ip_hash TEXT,  -- hashed IP for privacy
  user_agent TEXT,
  device_type TEXT CHECK (device_type IS NULL OR device_type IN ('mobile', 'desktop', 'tablet')),

  -- Revenue attribution (cents)
  revenue_cents BIGINT DEFAULT 0,

  -- Internal source (which PagRecovery feature generated this)
  internal_source TEXT CHECK (internal_source IS NULL OR internal_source IN (
    'recovery_whatsapp', 'recovery_email', 'recovery_voice', 'recovery_sms',
    'upsell', 'reactivation', 'cart_recovery', 'outbound_sales',
    'preventive', 'commerce', 'direct', 'affiliate', 'organic'
  )),
  internal_source_id TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_seller ON tracking_events (seller_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_campaign ON tracking_events (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_utm ON tracking_events (seller_key, utm_source, utm_medium, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_tracking_events_session ON tracking_events (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_visitor ON tracking_events (visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_customer ON tracking_events (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_lead ON tracking_events (lead_id) WHERE lead_id IS NOT NULL;

-- ── Daily stats (pre-aggregated for dashboard performance) ───

CREATE TABLE IF NOT EXISTS tracking_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  seller_key TEXT NOT NULL,
  campaign_id UUID REFERENCES tracking_campaigns(id) ON DELETE CASCADE,

  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Metrics
  page_views BIGINT DEFAULT 0,
  link_clicks BIGINT DEFAULT 0,
  unique_visitors BIGINT DEFAULT 0,
  checkout_starts BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  revenue_cents BIGINT DEFAULT 0,
  cost_cents BIGINT DEFAULT 0,

  -- Calculated rates
  click_through_rate NUMERIC(7,4) DEFAULT 0,
  conversion_rate NUMERIC(7,4) DEFAULT 0,
  cpa_cents BIGINT DEFAULT 0,
  roas NUMERIC(10,4) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(stat_date, seller_key, campaign_id, utm_source, utm_medium, utm_campaign)
);

CREATE INDEX IF NOT EXISTS idx_tracking_daily_seller ON tracking_daily_stats (seller_key, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_daily_campaign ON tracking_daily_stats (campaign_id, stat_date DESC);
