# HireIQ Decisions

## 2026-06-29 — Product scope: two pillars

**Context:** Older spec described a full "Job Search OS." New spec (SPEC.md v1.0) focuses on resume tailoring + application tracking only.

**Choice:** Treat cover letter, outreach, interview prep as secondary. Phase 1 follows spec order; do not delete working cover-letter code yet.

**Revisit if:** Users consistently ask for cover letter in MVP feedback.

---

## 2026-06-29 — Repo layout: code vs docs

**Context:** Root cluttered with specs, prototypes, SQL migrations, dev scripts.

**Choice:**
- `main` = `app/`, `components/`, `lib/`, `store/`, `types/`, config
- `docs/` = SPEC, session docs, `prototype/`, `scripts/`, `supabase/migrations/`

**Tradeoff:** Migration path is `docs/supabase/migrations/` not conventional `supabase/` at root. Documented in README.

**Revisit if:** We adopt Supabase CLI local dev and need standard `supabase/` layout — could symlink or move migrations back with `config.toml` only at root.

---

## 2026-06-29 — Profile storage: JSONB first, normalized tables later

**Context:** Spec defines `experiences`, `projects`, `skills` tables. App already uses `profiles.profile_data` and `resumes.structured_data` JSONB with provenance.

**Choice:** Keep JSONB for Phase 1. Add normalized tables when GitHub sync and application events need relational queries.

**Tradeoff:** Simpler ship; harder to query "all users with skill X" later.

**Revisit if:** Task 104 (GitHub) or analytics need SQL joins on experiences.

---

## 2026-06-29 — PDF export: @react-pdf/renderer

**Context:** Spec suggests Puppeteer/Playwright for PDF. App uses `@react-pdf/renderer` for Vercel serverless compatibility.

**Choice:** Keep react-pdf. Layout QA (spec §3.5) runs on structured data + render metrics, not headless Chrome.

**Revisit if:** Visual fidelity requirements exceed react-pdf capabilities.

---

## 2026-06-29 — Applications: extend `jobs` table short-term

**Context:** Spec has dedicated `applications` table. App already tracks `application_status` on `jobs`.

**Choice:** Task 105 adds `applications` additively and backfills from `jobs`. No destructive migration.

**Revisit if:** Schema duplication becomes confusing — then deprecate job-status columns on `jobs`.
