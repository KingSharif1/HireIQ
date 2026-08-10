-- Task 117: Extension website-connect codes + ATS account email on applications
-- Rollback:
--   DROP TABLE IF EXISTS extension_connect_codes;
--   ALTER TABLE applications DROP COLUMN IF EXISTS ats_account_email;
--   ALTER TABLE applications DROP COLUMN IF EXISTS ats_account_note;

CREATE TABLE IF NOT EXISTS extension_connect_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS extension_connect_codes_hash_idx
  ON extension_connect_codes (code_hash)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS extension_connect_codes_expires_idx
  ON extension_connect_codes (expires_at);

ALTER TABLE extension_connect_codes ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated — service-role API only.

COMMENT ON TABLE extension_connect_codes IS
  'One-time codes for Chrome extension website connect; stores short-lived session tokens.';

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ats_account_email TEXT;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ats_account_note TEXT;

COMMENT ON COLUMN applications.ats_account_email IS
  'Email the user used (or will use) on the employer ATS — for status tracking.';
