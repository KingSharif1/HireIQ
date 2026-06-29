-- Task 102: tracked change accept/decline decisions
-- Additive + idempotent. Existing tailored rows keep working (empty decisions = all accepted).

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS original_structured_data JSONB;

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS change_decisions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Rollback (manual):
-- ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS original_structured_data;
-- ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS change_decisions;
