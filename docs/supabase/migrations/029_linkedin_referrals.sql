-- LinkedIn referrals (v2): synced connections, referral contacts, outreach state machine.
-- Additive. Ingest is CSV-first (LinkedIn "Connections" export); OAuth is own-profile context only.
-- See docs/LINKEDIN-REFERRALS.md.

CREATE TABLE IF NOT EXISTS linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  url TEXT,
  company TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  email TEXT,
  connected_on TEXT,
  source TEXT NOT NULL DEFAULT 'csv' CHECK (source IN ('csv', 'oauth')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS linkedin_connections_user_idx
  ON linkedin_connections (user_id, created_at DESC);

-- One connection per (user, url) — idempotent CSV re-imports.
CREATE UNIQUE INDEX IF NOT EXISTS linkedin_connections_user_url_idx
  ON linkedin_connections (user_id, url)
  WHERE url IS NOT NULL AND url <> '';

ALTER TABLE linkedin_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own linkedin connections" ON linkedin_connections;
CREATE POLICY "Users read own linkedin connections"
  ON linkedin_connections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own linkedin connections" ON linkedin_connections;
CREATE POLICY "Users insert own linkedin connections"
  ON linkedin_connections FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON linkedin_connections TO authenticated;
GRANT ALL ON TABLE linkedin_connections TO service_role;

CREATE TABLE IF NOT EXISTS referral_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES linkedin_connections(id) ON DELETE CASCADE,
  target_company TEXT NOT NULL DEFAULT '',
  warmth TEXT NOT NULL DEFAULT 'unknown' CHECK (warmth IN ('strong', 'warm', 'cold', 'unknown')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_contacts_user_idx
  ON referral_contacts (user_id, target_company);

ALTER TABLE referral_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referral contacts" ON referral_contacts;
CREATE POLICY "Users read own referral contacts"
  ON referral_contacts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own referral contacts" ON referral_contacts;
CREATE POLICY "Users insert own referral contacts"
  ON referral_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON referral_contacts TO authenticated;
GRANT ALL ON TABLE referral_contacts TO service_role;

CREATE TABLE IF NOT EXISTS referral_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES linkedin_connections(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'drafting'
    CHECK (stage IN ('drafting', 'intro_asked', 'referred', 'replied', 'declined', 'no_response')),
  message_draft TEXT,
  referral_strength REAL,
  asked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_outreach_user_updated_idx
  ON referral_outreach (user_id, updated_at DESC);

ALTER TABLE referral_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referral outreach" ON referral_outreach;
CREATE POLICY "Users read own referral outreach"
  ON referral_outreach FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own referral outreach" ON referral_outreach;
CREATE POLICY "Users insert own referral outreach"
  ON referral_outreach FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own referral outreach" ON referral_outreach;
CREATE POLICY "Users update own referral outreach"
  ON referral_outreach FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON referral_outreach TO authenticated;
GRANT ALL ON TABLE referral_outreach TO service_role;

COMMENT ON TABLE linkedin_connections IS 'Synced 1st-degree connections (LinkedIn Connections.csv, or OAuth).';
COMMENT ON TABLE referral_outreach IS 'Per-connection/per-job referral ask → referred → replied funnel. Messages are drafts — never sent by HireIQ.';

-- Rollback:
-- DROP TABLE IF EXISTS referral_outreach;
-- DROP TABLE IF EXISTS referral_contacts;
-- DROP TABLE IF EXISTS linkedin_connections;
