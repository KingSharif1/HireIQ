-- Masked application email (Resend inbound) — additive, idempotent
-- Domain: MASKED_EMAIL_DOMAIN (e.g. mail.kingsharif.com)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS masked_email TEXT,
  ADD COLUMN IF NOT EXISTS email_forward_to TEXT,
  ADD COLUMN IF NOT EXISTS email_forward_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_masked_email_unique
  ON profiles (lower(masked_email))
  WHERE masked_email IS NOT NULL;

COMMENT ON COLUMN profiles.masked_email IS 'HireIQ apply address; employer mail lands via Resend inbound';
COMMENT ON COLUMN profiles.email_forward_to IS 'Optional real inbox for forwards; null = profiles.email';
COMMENT ON COLUMN profiles.email_forward_enabled IS 'When true, inbound mail is relayed to email_forward_to / email';

CREATE TABLE IF NOT EXISTS inbound_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  masked_email TEXT NOT NULL,
  resend_email_id TEXT,
  message_id TEXT,
  from_address TEXT,
  to_addresses TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  body_preview TEXT,
  parsed_status TEXT,
  confidence NUMERIC,
  forwarded_at TIMESTAMPTZ,
  raw_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS inbound_email_events_resend_email_id_unique
  ON inbound_email_events (resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS inbound_email_events_user_created_idx
  ON inbound_email_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inbound_email_events_application_idx
  ON inbound_email_events (application_id)
  WHERE application_id IS NOT NULL;

ALTER TABLE inbound_email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own inbound emails" ON inbound_email_events;
CREATE POLICY "Users read own inbound emails"
  ON inbound_email_events FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates come from service role (webhook); no user INSERT policy.

-- Rollback (manual, if needed):
-- DROP TABLE IF EXISTS inbound_email_events;
-- DROP INDEX IF EXISTS profiles_masked_email_unique;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS masked_email;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS email_forward_to;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS email_forward_enabled;
