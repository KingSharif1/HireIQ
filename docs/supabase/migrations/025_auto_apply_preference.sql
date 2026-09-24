-- Auto-apply submits eligible selected jobs by default; users may choose review-first in Settings.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auto_apply_submit BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN profiles.auto_apply_submit IS
  'When true, hosted auto-apply may submit eligible forms; false fills and pauses for review.';

-- Rollback (only after deploying code that no longer reads this column):
-- ALTER TABLE profiles DROP COLUMN IF EXISTS auto_apply_submit;
