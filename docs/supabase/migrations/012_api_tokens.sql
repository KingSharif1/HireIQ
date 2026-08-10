-- Task 116: Chrome extension API tokens (hashed; plaintext shown once)
-- Rollback:
--   DROP POLICY IF EXISTS api_tokens_select_own ON api_tokens;
--   DROP POLICY IF EXISTS api_tokens_delete_own ON api_tokens;
--   DROP TABLE IF EXISTS api_tokens;

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Chrome extension',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_tokens_user_id_idx ON api_tokens (user_id);
CREATE INDEX IF NOT EXISTS api_tokens_token_hash_idx ON api_tokens (token_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_tokens_select_own ON api_tokens;
CREATE POLICY api_tokens_select_own ON api_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS api_tokens_delete_own ON api_tokens;
CREATE POLICY api_tokens_delete_own ON api_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Inserts/updates of hashes go through service-role API routes only (no INSERT policy for authenticated).

COMMENT ON TABLE api_tokens IS 'Hashed API tokens for Chrome extension; plaintext never stored.';
