-- Task 114/Settings: exclusive email tracking mode (gmail | masked | off)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_tracking_mode TEXT NOT NULL DEFAULT 'gmail';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_tracking_mode_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_email_tracking_mode_check
      CHECK (email_tracking_mode IN ('gmail', 'masked', 'off'));
  END IF;
END $$;

COMMENT ON COLUMN profiles.email_tracking_mode IS
  'How employer mail is tracked: gmail (default), masked apply address, or off (manual).';

-- Rollback (manual):
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_tracking_mode_check;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS email_tracking_mode;
