-- 030 — applied to prod 2026-11-23 (King approved).
-- Issue #30: add explicit 'screening' and 'skipped' statuses to the tracker.
-- ('ghosted' stays derived in code: applied + no reply for 21 days — see lib/applications/pulse.ts.)
-- After applying: add both values to ApplicationStatus (types/index.ts), APPLICATION_STATUSES
-- (lib/jobs/status.ts), the status route enum, and STATUS_MAP in lib/applications/ledger-import.ts.

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check CHECK (
    status = ANY (ARRAY[
      'bookmarked', 'applying', 'applied', 'screening', 'interviewing',
      'negotiating', 'offer', 'accepted', 'rejected', 'skipped'
    ]::text[])
  );

-- Rollback:
-- ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
-- ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status = ANY (ARRAY[
--   'bookmarked','applying','applied','interviewing','negotiating','offer','accepted','rejected']::text[]));
