# Supabase migrations

Apply in numeric order on the remote project (`wsbbgznobxhjefaqbniv`). Use Supabase SQL editor or MCP when authenticated.

| # | File | Status | Notes |
|---|------|--------|-------|
| 001–018 | `docs/supabase/migrations/00*.sql` | Applied | See STATUS.md |
| **019** | `019_ats_account_password.sql` | **Applied** (2026-08-13 via Supabase MCP) | Adds `applications.ats_account_password` for extension agentic apply + job timeline portal login |
| **020** | `020_forward_save_email.sql` | **Applied** (2026-08-13 via Supabase MCP) | `profiles.forward_save_email` unique — forward job postings into the tracker |

## Apply 019

```sql
-- docs/supabase/migrations/019_ats_account_password.sql
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ats_account_password TEXT;

COMMENT ON COLUMN applications.ats_account_password IS
  'Employer portal password when HireIQ agentic apply created the account. User-visible on timeline.';
```

Verify:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'applications'
  AND column_name IN ('ats_account_email', 'ats_account_note', 'ats_account_password');
```

Rollback (only if needed):

```sql
ALTER TABLE applications DROP COLUMN IF EXISTS ats_account_password;
```
