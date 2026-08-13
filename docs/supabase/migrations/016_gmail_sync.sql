-- Task 114 slice 1: Gmail connect + opt-out pref (default ON)
-- Additive / idempotent. No DROP of data tables.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.gmail_sync_enabled IS
  'When Google Gmail is connected, sync employer mail by default; user may opt out.';

CREATE TABLE IF NOT EXISTS google_connections (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  token_scopes TEXT,
  token_expires_at TIMESTAMPTZ,
  history_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "google_connections_own" ON google_connections;
CREATE POLICY "google_connections_own" ON google_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE google_connections IS
  'Google OAuth tokens for Gmail readonly sync — server routes only in practice.';

-- Rollback (manual, if needed — do not run casually):
-- DROP TABLE IF EXISTS google_connections;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS gmail_sync_enabled;
