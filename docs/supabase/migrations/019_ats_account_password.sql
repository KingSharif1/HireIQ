-- Portal password created by extension agentic apply (shown on job timeline / Activity).
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ats_account_password TEXT;

COMMENT ON COLUMN applications.ats_account_password IS
  'Employer portal password when HireIQ agentic apply created the account. User-visible on timeline.';

-- Rollback:
-- ALTER TABLE applications DROP COLUMN IF EXISTS ats_account_password;
