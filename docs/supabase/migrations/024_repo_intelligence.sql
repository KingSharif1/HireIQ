-- Task 164: cached, per-commit GitHub repository intelligence.
-- Additive only. Existing profiles.github_data remains the lightweight repo index.

CREATE TABLE IF NOT EXISTS repo_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  repo_id BIGINT NOT NULL,
  full_name TEXT NOT NULL,
  default_branch TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  repo_pushed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scanning'
    CHECK (status IN ('scanning', 'ready', 'failed')),
  intelligence JSONB NOT NULL DEFAULT '{}'::jsonb,
  tree_file_count INT NOT NULL DEFAULT 0,
  analyzed_file_count INT NOT NULL DEFAULT 0,
  tree_truncated BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS repo_intelligence_user_repo_sha_idx
  ON repo_intelligence (user_id, repo_id, commit_sha);

CREATE INDEX IF NOT EXISTS repo_intelligence_user_repo_latest_idx
  ON repo_intelligence (user_id, repo_id, updated_at DESC);

ALTER TABLE repo_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own repo intelligence" ON repo_intelligence;
CREATE POLICY "Users read own repo intelligence"
  ON repo_intelligence FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own repo intelligence" ON repo_intelligence;
CREATE POLICY "Users insert own repo intelligence"
  ON repo_intelligence FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own repo intelligence" ON repo_intelligence;
CREATE POLICY "Users update own repo intelligence"
  ON repo_intelligence FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON TABLE repo_intelligence IS
  'Task 164: bounded GitHub repository analysis cached by owner, repository, and default-branch commit SHA.';

GRANT SELECT, INSERT, UPDATE ON repo_intelligence TO authenticated;
