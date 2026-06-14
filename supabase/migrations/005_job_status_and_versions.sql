-- Phase 5: job status tracking + tailored-resume versions (Q23, Q34)
-- Additive + idempotent. Existing rows get safe defaults; existing reads unaffected.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'not_applied';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tailoring_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE tailored_resumes ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE tailored_resumes ADD COLUMN IF NOT EXISTS gap_answers JSONB NOT NULL DEFAULT '[]';
ALTER TABLE tailored_resumes ADD COLUMN IF NOT EXISTS user_edited BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS tailored_resumes_job_version_idx
  ON tailored_resumes (job_id, version DESC);

-- Rollback (manual):
-- ALTER TABLE jobs DROP COLUMN IF EXISTS application_status, DROP COLUMN IF EXISTS tailoring_status, DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS version, DROP COLUMN IF EXISTS gap_answers, DROP COLUMN IF EXISTS user_edited;
