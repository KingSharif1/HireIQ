-- Task 120: expand application statuses to Teal set + rejected
-- Map legacy not_applied → bookmarked
-- Rollback:
--   UPDATE applications SET status = 'not_applied' WHERE status = 'bookmarked';
--   UPDATE jobs SET application_status = 'not_applied' WHERE application_status = 'bookmarked';
--   (then restore old CHECK constraints)

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'bookmarked', 'applying', 'applied', 'interviewing',
    'negotiating', 'offer', 'accepted', 'rejected',
    'not_applied'
  ));

UPDATE applications
SET status = 'bookmarked', updated_at = NOW()
WHERE status = 'not_applied';

UPDATE jobs
SET application_status = 'bookmarked', updated_at = NOW()
WHERE application_status = 'not_applied';

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'bookmarked', 'applying', 'applied', 'interviewing',
    'negotiating', 'offer', 'accepted', 'rejected'
  ));

ALTER TABLE jobs ALTER COLUMN application_status SET DEFAULT 'bookmarked';

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS inclusion JSONB DEFAULT NULL;

-- Drawer notes already on applications.notes; email log + templates as JSONB on applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS email_log JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS templates JSONB NOT NULL DEFAULT '[]'::jsonb;
