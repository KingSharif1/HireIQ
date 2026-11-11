-- Credit ledger: monthly grant + per-application debits (Sprout-style budget).
-- Additive. Per-application price comes from lib/apply/credit-cost (1 vs 3 credits).
-- Debit enforcement (atomic "can afford" check) must live server-side — see note at bottom.

CREATE TABLE IF NOT EXISTS credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('monthly', 'purchase', 'promo', 'refund')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS credit_grants_user_period_idx
  ON credit_grants (user_id, period_end DESC);

-- One grant per (user, period, kind) — makes the monthly mint idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS credit_grants_user_period_kind_idx
  ON credit_grants (user_id, period_start, kind);

ALTER TABLE credit_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own credit grants" ON credit_grants;
CREATE POLICY "Users read own credit grants"
  ON credit_grants FOR SELECT
  USING (auth.uid() = user_id);

-- Grants are system-minted (monthly cron / purchase); no authenticated INSERT.
GRANT SELECT ON credit_grants TO authenticated;
GRANT ALL ON TABLE credit_grants TO service_role;

COMMENT ON TABLE credit_grants IS
  'Monthly / purchase / promo / refund credit allowances with an active [period_start, period_end) window.';

CREATE TABLE IF NOT EXISTS credit_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cost INT NOT NULL CHECK (cost > 0),
  kind TEXT NOT NULL CHECK (kind IN ('apply', 'tailor', 'cover_letter')),
  job_application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_usages_user_created_idx
  ON credit_usages (user_id, created_at DESC);

ALTER TABLE credit_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own credit usages" ON credit_usages;
CREATE POLICY "Users read own credit usages"
  ON credit_usages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own credit usages" ON credit_usages;
CREATE POLICY "Users insert own credit usages"
  ON credit_usages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON credit_usages TO authenticated;
GRANT ALL ON TABLE credit_usages TO service_role;

COMMENT ON TABLE credit_usages IS
  'Per-application credit debits (apply / tailor / cover letter). Debit enforcement (atomic can-afford) is a server-side concern, not RLS.';

-- Atomic debit: check can-afford and insert the usage in one transaction so
-- concurrent applies can't overspend. SECURITY DEFINER + service_role only —
-- the API calls this with the service key; users never insert usages directly
-- (their RLS insert policy stays as a fallback for future client-side reads).
CREATE OR REPLACE FUNCTION debit_credits(
  p_user_id UUID,
  p_cost INT,
  p_kind TEXT,
  p_job_application_id UUID DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INT;
BEGIN
  SELECT
    COALESCE((
      SELECT SUM(g.amount) FROM credit_grants g
      WHERE g.user_id = p_user_id AND g.period_start <= NOW() AND NOW() < g.period_end
    ), 0)
    - COALESCE((
      SELECT SUM(u.cost) FROM credit_usages u
      JOIN credit_grants g
        ON g.user_id = u.user_id
       AND g.period_start <= u.created_at AND u.created_at < g.period_end
      WHERE u.user_id = p_user_id
    ), 0)
  INTO v_remaining;

  IF v_remaining < p_cost THEN
    RAISE EXCEPTION 'insufficient_credits:need=% have=%', p_cost, v_remaining;
  END IF;

  INSERT INTO credit_usages (user_id, cost, kind, job_application_id)
  VALUES (p_user_id, p_cost, p_kind, p_job_application_id);

  RETURN v_remaining - p_cost;
END;
$$;

REVOKE ALL ON FUNCTION debit_credits(UUID, INT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION debit_credits(UUID, INT, TEXT, UUID) TO service_role;

-- Rollback:
-- DROP FUNCTION IF EXISTS debit_credits(UUID, INT, TEXT, UUID);
-- DROP TABLE IF EXISTS credit_usages;
-- DROP TABLE IF EXISTS credit_grants;
