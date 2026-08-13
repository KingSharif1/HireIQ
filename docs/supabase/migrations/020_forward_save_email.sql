-- Task 115: per-user address for forwarding job postings into the tracker
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS forward_save_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_forward_save_email_unique
  ON profiles (lower(forward_save_email))
  WHERE forward_save_email IS NOT NULL;

COMMENT ON COLUMN profiles.forward_save_email IS
  'Forward job posting emails here; inbound webhook extracts a URL and saves to the tracker.';

-- Rollback (manual):
-- DROP INDEX IF EXISTS profiles_forward_save_email_unique;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS forward_save_email;
