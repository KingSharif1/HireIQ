-- Task 107: applications + application_events (additive)
-- Backfills one application per job; keeps jobs.application_status until full cutover.
-- Rollback:
--   DROP TRIGGER IF EXISTS jobs_ensure_application ON jobs;
--   DROP FUNCTION IF EXISTS ensure_application_for_job();
--   DROP TABLE IF EXISTS application_events;
--   DROP TABLE IF EXISTS applications;

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tailored_resume_id UUID REFERENCES tailored_resumes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_applied'
    CHECK (status IN (
      'not_applied', 'applied', 'interviewing', 'offer', 'rejected', 'accepted'
    )),
  applied_at TIMESTAMPTZ,
  notes TEXT,
  follow_up_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'created', 'status_change', 'note', 'email_linked', 'manual'
    )),
  from_status TEXT,
  to_status TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applications_user_status_idx
  ON applications (user_id, status);

CREATE INDEX IF NOT EXISTS applications_user_updated_idx
  ON applications (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS application_events_app_created_idx
  ON application_events (application_id, created_at DESC);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_all_own" ON applications;
CREATE POLICY "applications_all_own" ON applications
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "application_events_all_own" ON application_events;
CREATE POLICY "application_events_all_own" ON application_events
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON application_events TO authenticated;

-- Backfill from existing jobs (idempotent)
INSERT INTO applications (user_id, job_id, status, created_at, updated_at, source)
SELECT
  j.user_id,
  j.id,
  COALESCE(NULLIF(j.application_status, ''), 'not_applied'),
  COALESCE(j.created_at, NOW()),
  COALESCE(j.updated_at, j.created_at, NOW()),
  COALESCE(NULLIF(j.source, ''), 'manual')
FROM jobs j
ON CONFLICT (user_id, job_id) DO NOTHING;

INSERT INTO application_events (application_id, user_id, event_type, to_status, meta)
SELECT
  a.id,
  a.user_id,
  'created',
  a.status,
  '{"source":"backfill"}'::jsonb
FROM applications a
WHERE NOT EXISTS (
  SELECT 1
  FROM application_events e
  WHERE e.application_id = a.id
    AND e.event_type = 'created'
);

-- Keep applications in sync when new jobs are inserted
CREATE OR REPLACE FUNCTION ensure_application_for_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  app_id UUID;
  app_status TEXT;
BEGIN
  app_status := COALESCE(NULLIF(NEW.application_status, ''), 'not_applied');

  INSERT INTO applications (user_id, job_id, status, created_at, updated_at, source)
  VALUES (
    NEW.user_id,
    NEW.id,
    app_status,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW()),
    COALESCE(NULLIF(NEW.source, ''), 'manual')
  )
  ON CONFLICT (user_id, job_id) DO NOTHING
  RETURNING id INTO app_id;

  IF app_id IS NULL THEN
    SELECT id INTO app_id
    FROM applications
    WHERE user_id = NEW.user_id AND job_id = NEW.id;
  END IF;

  IF app_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM application_events e
    WHERE e.application_id = app_id AND e.event_type = 'created'
  ) THEN
    INSERT INTO application_events (application_id, user_id, event_type, to_status, meta)
    VALUES (app_id, NEW.user_id, 'created', app_status, '{"source":"job_insert"}'::jsonb);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_ensure_application ON jobs;
CREATE TRIGGER jobs_ensure_application
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_application_for_job();
