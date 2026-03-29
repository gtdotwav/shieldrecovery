-- Migration: Add callcenter → checkout integration fields
-- Date: 2026-03-29
-- Adds coupon, chosen payment method, and checkout session tracking to calls table
-- Adds coupon code to callcenter settings

-- New columns on calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS chosen_payment_method TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- New column on callcenter_settings table
ALTER TABLE callcenter_settings ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT '';
