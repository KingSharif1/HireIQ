-- HireIQ — Extended profile (Sprout-style structured profile)
-- Adds a single JSONB column to store all professional-profile sections
-- (summary, urls, experience, volunteering, projects, education, skills,
--  certifications, achievements, additional, documents, attachments).
-- Run this in your Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Reconcile name columns used by the app (the original migration shipped
-- full_name; the app uses first_name/last_name/username). Idempotent.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
