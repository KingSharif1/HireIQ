-- Scout inbox: jobs found by the daily scout, alert emails, or pasted links that
-- the user has not decided on yet. Swiping right saves a row in `jobs`.
CREATE TABLE IF NOT EXISTS job_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'other'
    CHECK (source IN ('ats-search', 'indeed', 'linkedin', 'manual', 'other')),
  source_url TEXT NOT NULL,
  url_key TEXT NOT NULL,
  apply_url TEXT,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  remote BOOLEAN,
  description TEXT,
  fit_score INT CHECK (fit_score IS NULL OR (fit_score >= 0 AND fit_score <= 100)),
  fit_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  deal_breakers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'liked', 'skipped', 'later')),
  liveness TEXT NOT NULL DEFAULT 'unknown'
    CHECK (liveness IN ('live', 'closed', 'blocked', 'unknown')),
  liveness_reason TEXT,
  apply_vendor TEXT,
  apply_verdict TEXT,
  apply_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_blocked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS job_leads_user_url_key
  ON job_leads (user_id, url_key);

CREATE INDEX IF NOT EXISTS job_leads_user_status_idx
  ON job_leads (user_id, status, fit_score DESC NULLS LAST, created_at DESC);

ALTER TABLE job_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own job leads" ON job_leads;
CREATE POLICY "Users read own job leads"
  ON job_leads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own job leads" ON job_leads;
CREATE POLICY "Users update own job leads"
  ON job_leads FOR UPDATE
  USING (auth.uid() = user_id);

-- Inserts go through the server (service role) so every lead passes the safety
-- and deal-breaker checks first.
GRANT SELECT, UPDATE ON job_leads TO authenticated;

COMMENT ON TABLE job_leads IS
  'Undecided jobs from the scout, forwarded Indeed/LinkedIn alert emails, or pasted links. Swipe right saves to jobs.';
