# Changelog

## 2026-06-29 — Task 101: Structured 3-tier gap analysis

**What:** `/api/tailor/questions` now runs `GAP_ANALYSIS_PROMPT` returning direct/adjacent/real gaps plus max 3 questions. Gap summary shown on tailor step 4 before Q&A. Real gaps and adjacent framing injected into tailor generate/regenerate prompts.

**Files:** `lib/ai/gap-analysis.ts`, `lib/ai/prompts.ts`, `app/api/tailor/questions/route.ts`, `components/tailor/GapAnalysisSummary.tsx`, `store/index.ts`, `app/dashboard/tailor/page.tsx`, `lib/ai/tailor-pipeline.ts`

**Next:** Task 103 (Workday + LinkedIn job URLs).

---

## 2026-06-29 — Task 102: Tracked changes accept/decline

**What:** Interactive diff review on Job Hub Changes tab. Accept/decline/edit per change with decline reasons. Export (PDF/DOCX) uses approved resume; blocks while changes are pending. Migration 006 adds `original_structured_data` and `change_decisions` columns.

**Files:** `lib/tailor/change-decisions.ts`, `components/tailor/TailorDiff.tsx`, `components/jobs/JobHub.tsx`, `app/api/tailor/[id]/decisions/route.ts`, export routes, `docs/supabase/migrations/006_change_decisions.sql`

**Why:** Spec §3.6 — key UX differentiator for tailoring workflow.

**Next:** Run migration 006 in Supabase; Task 101 (structured gap analysis).

---

## 2026-06-29 — Task 100: Docs layout + spec alignment audit

**What:** Reorganized repo so `main` is application code only. Created agent session docs mapping current implementation to SPEC v1.0. Moved `prototype/`, `scripts/`, `supabase/`, and legacy spec into `docs/`.

**Files:** `docs/**`, `README.md`, `package.json`, `.gitignore`, `.cursor/rules/verification.mdc`, `app/dashboard/notifications/page.tsx`

**Why:** Clean workspace for building Phase 1; single source of truth for what exists vs what the spec requires.

**Next:** Task 101 (structured gap analysis) or Task 102 (accept/decline diff UI).
