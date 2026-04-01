-- Affiliate links: sellers can create invite links and earn commission on referrals' recoveries

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_key TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  label TEXT,
  commission_pct DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  clicks INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_seller_key ON affiliate_links(seller_key);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(code);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  referrer_seller_key TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  referred_seller_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_link ON affiliate_referrals(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer ON affiliate_referrals(referrer_seller_key);
