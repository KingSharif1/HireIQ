-- Task 112b: visual resume theme storage (additive, not applied until Designer UI)
-- Rollback:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS resume_theme;
-- ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS theme_override;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS resume_theme JSONB DEFAULT NULL;

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS theme_override JSONB DEFAULT NULL;
