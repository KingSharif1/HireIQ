-- Auth: populate first_name / last_name on signup (email + Google OAuth)
-- Matches remote HireIQ schema (no full_name column on profiles).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fn TEXT;
  ln TEXT;
  full TEXT;
  meta JSONB;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  full := NULLIF(trim(COALESCE(meta->>'full_name', meta->>'name', '')), '');
  fn := NULLIF(trim(COALESCE(meta->>'first_name', split_part(COALESCE(full, ''), ' ', 1), '')), '');
  ln := NULLIF(trim(COALESCE(
    meta->>'last_name',
    CASE
      WHEN full IS NOT NULL AND position(' ' IN full) > 0
        THEN trim(substring(full FROM position(' ' IN full) + 1))
      ELSE ''
    END,
    ''
  )), '');

  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, fn, ln);

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
