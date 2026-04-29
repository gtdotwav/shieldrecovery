-- Row-Level Security scaffold (defense-in-depth).
--
-- Policies are CREATED here but RLS is left DISABLED on every table so that
-- existing application code (which uses the service-role key) is not broken
-- by an unfinished multi-tenancy backfill. Operations team enables RLS once
-- seller_key has been backfilled to 100% (see 20260429_seller_key_shadow.sql).
--
-- To enable for a given table:
--   ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
-- To roll back:
--   ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
--
-- The service-role key always bypasses RLS, so internal jobs continue to
-- read/write freely. Authenticated users are scoped via the `auth.jwt()`
-- helper to the seller_key embedded in their session.

-- recovery_leads
DROP POLICY IF EXISTS recovery_leads_select_own ON recovery_leads;
CREATE POLICY recovery_leads_select_own ON recovery_leads
  FOR SELECT
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

DROP POLICY IF EXISTS recovery_leads_modify_own ON recovery_leads;
CREATE POLICY recovery_leads_modify_own ON recovery_leads
  FOR ALL
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  )
  WITH CHECK (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

-- conversations
DROP POLICY IF EXISTS conversations_select_own ON conversations;
CREATE POLICY conversations_select_own ON conversations
  FOR SELECT
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

DROP POLICY IF EXISTS conversations_modify_own ON conversations;
CREATE POLICY conversations_modify_own ON conversations
  FOR ALL
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  )
  WITH CHECK (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

-- messages
DROP POLICY IF EXISTS messages_select_own ON messages;
CREATE POLICY messages_select_own ON messages
  FOR SELECT
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

DROP POLICY IF EXISTS messages_modify_own ON messages;
CREATE POLICY messages_modify_own ON messages
  FOR ALL
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  )
  WITH CHECK (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

-- payments
DROP POLICY IF EXISTS payments_select_own ON payments;
CREATE POLICY payments_select_own ON payments
  FOR SELECT
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

-- customers
DROP POLICY IF EXISTS customers_select_own ON customers;
CREATE POLICY customers_select_own ON customers
  FOR SELECT
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

-- queue_jobs
DROP POLICY IF EXISTS queue_jobs_select_own ON queue_jobs;
CREATE POLICY queue_jobs_select_own ON queue_jobs
  FOR SELECT
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

-- follow_up_cadences
DROP POLICY IF EXISTS follow_up_cadences_select_own ON follow_up_cadences;
CREATE POLICY follow_up_cadences_select_own ON follow_up_cadences
  FOR SELECT
  USING (
    seller_key IS NOT NULL
    AND seller_key = (auth.jwt() ->> 'seller_key')
  );

-- The matching ENABLE statements are intentionally NOT executed here. Run
-- them manually once the backfill (function backfill_seller_key_from_agents)
-- reports zero remaining rows for every table.
