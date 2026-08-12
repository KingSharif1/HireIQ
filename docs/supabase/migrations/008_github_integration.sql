-- Task 105: GitHub OAuth connection + repo metadata on profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS github_data JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS github_connections (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_scopes TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "github_connections_own" ON github_connections;
CREATE POLICY "github_connections_own" ON github_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON COLUMN profiles.github_data IS 'Cached GitHub repo metadata (no tokens). Refreshed on sync.';
COMMENT ON TABLE github_connections IS 'OAuth tokens for GitHub API — server routes only in practice.';
