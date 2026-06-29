# Changelog

## 2026-06-29 — Task 100: Docs layout + spec alignment audit

**What:** Reorganized repo so `main` is application code only. Created agent session docs mapping current implementation to SPEC v1.0. Moved `prototype/`, `scripts/`, `supabase/`, and legacy spec into `docs/`.

**Files:** `docs/**`, `README.md`, `package.json`, `.gitignore`, `.cursor/rules/verification.mdc`, `app/dashboard/notifications/page.tsx`

**Why:** Clean workspace for building Phase 1; single source of truth for what exists vs what the spec requires.

**Next:** Task 101 (structured gap analysis) or Task 102 (accept/decline diff UI).
