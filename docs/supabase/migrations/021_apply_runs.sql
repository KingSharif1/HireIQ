-- Task 148: hosted Auto-apply with HireIQ (Cloud Run Playwright)
CREATE TABLE IF NOT EXISTS apply_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'server' CHECK (mode IN ('server', 'extension')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued', 'running', 'applied', 'failed', 'needs_user', 'cancelled'
    )),
  complexity INT NOT NULL DEFAULT 1 CHECK (complexity IN (1, 3)),
  board TEXT,
  apply_url TEXT,
  submit BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apply_runs_user_created_idx
  ON apply_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS apply_runs_job_idx
  ON apply_runs (job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS apply_runs_queued_idx
  ON apply_runs (status, created_at ASC)
  WHERE status = 'queued';

ALTER TABLE apply_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own apply runs" ON apply_runs;
CREATE POLICY "Users read own apply runs"
  ON apply_runs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own apply runs" ON apply_runs;
CREATE POLICY "Users insert own apply runs"
  ON apply_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own apply runs" ON apply_runs;
CREATE POLICY "Users update own apply runs"
  ON apply_runs FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE apply_runs IS
  'Hosted/extension auto-apply attempts (Task 148). Worker uses service role.';

GRANT SELECT, INSERT, UPDATE ON apply_runs TO authenticated;

-- Rollback:
-- DROP TABLE IF EXISTS apply_runs;
