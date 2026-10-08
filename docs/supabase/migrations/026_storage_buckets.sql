-- Private storage buckets the app expects. Idempotent so a fresh database can be
-- rebuilt from this repo (these used to be created by hand in the dashboard).
-- Object paths are `{userId}/...`, so the first folder is the owner.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('resumes', 'resumes', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = COALESCE(storage.buckets.file_size_limit, EXCLUDED.file_size_limit);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exports', 'exports', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = COALESCE(storage.buckets.file_size_limit, EXCLUDED.file_size_limit);

DROP POLICY IF EXISTS resumes_owner_select ON storage.objects;
CREATE POLICY resumes_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS resumes_owner_insert ON storage.objects;
CREATE POLICY resumes_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS resumes_owner_update ON storage.objects;
CREATE POLICY resumes_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS resumes_owner_delete ON storage.objects;
CREATE POLICY resumes_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS exports_owner_select ON storage.objects;
CREATE POLICY exports_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS exports_owner_insert ON storage.objects;
CREATE POLICY exports_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS exports_owner_update ON storage.objects;
CREATE POLICY exports_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS exports_owner_delete ON storage.objects;
CREATE POLICY exports_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Rollback:
-- DROP POLICY IF EXISTS resumes_owner_select ON storage.objects;
-- DROP POLICY IF EXISTS resumes_owner_insert ON storage.objects;
-- DROP POLICY IF EXISTS resumes_owner_update ON storage.objects;
-- DROP POLICY IF EXISTS resumes_owner_delete ON storage.objects;
-- DROP POLICY IF EXISTS exports_owner_select ON storage.objects;
-- DROP POLICY IF EXISTS exports_owner_insert ON storage.objects;
-- DROP POLICY IF EXISTS exports_owner_update ON storage.objects;
-- DROP POLICY IF EXISTS exports_owner_delete ON storage.objects;
-- DELETE FROM storage.buckets WHERE id IN ('resumes', 'exports');
