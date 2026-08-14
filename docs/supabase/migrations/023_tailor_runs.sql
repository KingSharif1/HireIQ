-- Task 151: durable tailor runs — one in-flight tailor per job, survives refresh.
CREATE TABLE IF NOT EXISTS tailor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'analyzing_gaps'
    CHECK (status IN (
      'analyzing_gaps',
      'awaiting_answers',
      'generating',
      'needs_review',
      'failed',
      'cancelled'
    )),
  process_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  gap_analysis JSONB,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  tailored_resume_id UUID REFERENCES tailored_resumes(id) ON DELETE SET NULL,
  error TEXT,
  gap_reserved BOOLEAN NOT NULL DEFAULT false,
  generate_reserved BOOLEAN NOT NULL DEFAULT false,
  claude_calls INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Only one unpaid/in-flight tailor per job (paid work or waiting on the user).
CREATE UNIQUE INDEX IF NOT EXISTS tailor_runs_one_active_per_job
  ON tailor_runs (user_id, job_id)
  WHERE status IN ('analyzing_gaps', 'awaiting_answers', 'generating');

CREATE INDEX IF NOT EXISTS tailor_runs_user_updated_idx
  ON tailor_runs (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS tailor_runs_job_idx
  ON tailor_runs (job_id, created_at DESC);

ALTER TABLE tailor_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tailor runs" ON tailor_runs;
CREATE POLICY "Users read own tailor runs"
  ON tailor_runs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own tailor runs" ON tailor_runs;
CREATE POLICY "Users insert own tailor runs"
  ON tailor_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own tailor runs" ON tailor_runs;
CREATE POLICY "Users update own tailor runs"
  ON tailor_runs FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE tailor_runs IS
  'Durable AI tailor session. Max 2 Claude calls (gap + one rewrite). Refresh attaches; never starts a second run.';

GRANT SELECT, INSERT, UPDATE ON tailor_runs TO authenticated;
