-- 031 — applied to prod 2026-11-23 (King approved). Security advisor: function executable by anon/authenticated.
-- Trigger and event-trigger functions run as their owner when they fire, so clients never need
-- EXECUTE. Verified on prod in a rolled-back probe: the profiles/resumes updated_at trigger still
-- fires for authenticated users, and the ensure_rls event trigger still enables RLS on new tables.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Rollback:
-- GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.set_updated_at() TO PUBLIC, anon, authenticated;
