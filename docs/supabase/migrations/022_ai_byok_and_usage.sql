-- Task 149: BYOK Anthropic key + AI usage / cost events
-- Additive. Ciphertext lives in user_ai_secrets (service role only — never SELECT for authenticated).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_key_source TEXT NOT NULL DEFAULT 'hireiq',
  ADD COLUMN IF NOT EXISTS ai_model_strong TEXT,
  ADD COLUMN IF NOT EXISTS ai_model_fast TEXT,
  ADD COLUMN IF NOT EXISTS anthropic_key_last4 TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_ai_key_source_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_ai_key_source_check
      CHECK (ai_key_source IN ('hireiq', 'byok'));
  END IF;
END $$;

COMMENT ON COLUMN profiles.ai_key_source IS
  'hireiq = pooled ANTHROPIC_API_KEY; byok = user key in user_ai_secrets.';
COMMENT ON COLUMN profiles.anthropic_key_last4 IS
  'Last 4 chars of user Anthropic key for Settings display. Never the full key.';

CREATE TABLE IF NOT EXISTS user_ai_secrets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  anthropic_key_ciphertext TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_ai_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE user_ai_secrets FROM PUBLIC;
REVOKE ALL ON TABLE user_ai_secrets FROM anon, authenticated;
GRANT ALL ON TABLE user_ai_secrets TO service_role;

COMMENT ON TABLE user_ai_secrets IS
  'Encrypted user Anthropic keys. No authenticated RLS policies — service_role only.';

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  key_source TEXT NOT NULL CHECK (key_source IN ('hireiq', 'byok')),
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx
  ON ai_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_feature_idx
  ON ai_usage_events (user_id, feature, created_at DESC);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ai usage" ON ai_usage_events;
CREATE POLICY "Users read own ai usage"
  ON ai_usage_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own ai usage" ON ai_usage_events;
CREATE POLICY "Users insert own ai usage"
  ON ai_usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON ai_usage_events TO authenticated;
GRANT ALL ON TABLE ai_usage_events TO service_role;

COMMENT ON TABLE ai_usage_events IS
  'Per-request AI/infra usage with estimated USD from published Anthropic rates (or Cloud Run apply estimate).';

-- Rollback:
-- DROP TABLE IF EXISTS ai_usage_events;
-- DROP TABLE IF EXISTS user_ai_secrets;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_ai_key_source_check;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS ai_key_source;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS ai_model_strong;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS ai_model_fast;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS anthropic_key_last4;
