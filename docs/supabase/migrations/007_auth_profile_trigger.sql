-- Auth: populate first_name / last_name on signup (email + Google OAuth)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  fn TEXT;
  ln TEXT;
  full TEXT;
  meta JSONB;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  fn := NULLIF(trim(meta->>'first_name'), '');
  ln := NULLIF(trim(meta->>'last_name'), '');
  full := NULLIF(trim(COALESCE(meta->>'full_name', meta->>'name', '')), '');

  -- Google OAuth often sends full_name / name only
  IF fn IS NULL AND full IS NOT NULL THEN
    fn := split_part(full, ' ', 1);
    ln := NULLIF(trim(substring(full from length(split_part(full, ' ', 1)) + 1)), '');
  END IF;

  IF full IS NULL AND (fn IS NOT NULL OR ln IS NOT NULL) THEN
    full := trim(concat_ws(' ', fn, ln));
  END IF;

  INSERT INTO profiles (id, email, full_name, first_name, last_name)
  VALUES (NEW.id, NEW.email, full, fn, ln);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rollback (manual): restore prior handle_new_user from 001_initial_schema.sql
