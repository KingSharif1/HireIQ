-- Task 117: store extension autofill answers on applications (additive)
-- Rollback:
--   ALTER TABLE applications DROP COLUMN IF EXISTS form_answers;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS form_answers jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN applications.form_answers IS
  'Extension autofill answers: [{ key, question, answer, updatedAt }]';
