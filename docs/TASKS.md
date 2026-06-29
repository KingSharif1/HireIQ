# HireIQ Tasks

Shared memory between agent sessions. **Claim one task, finish it, mark DONE, stop.**

Format:
```
## Task [ID] — [name]
Status: PENDING | IN PROGRESS | DONE | BLOCKED
Scope: [allowed files]
Result: [filled when done]
Files changed: [list]
```

---

## Task 100 — Repo docs + clean layout
Status: DONE  
Scope: `docs/`, root `README.md`, `package.json`, path updates  
Result: Moved prototype, scripts, supabase, specs into `docs/`. Created ARCHITECTURE, STATUS, TASKS, DECISIONS, CHANGELOG, SPEC. Updated npm script paths.  
Files changed: `docs/**`, `README.md`, `package.json`, `.gitignore`, `.cursor/rules/verification.mdc`, `app/dashboard/notifications/page.tsx`

---

## Task 101 — Structured gap analysis (spec §3.1)
Status: PENDING  
Scope: `lib/ai/prompts.ts`, `app/api/tailor/questions/route.ts`, `types/index.ts`, `components/tailor/QuestionFlow.tsx`  
Goal: API returns `{ direct_matches, adjacent_matches, real_gaps, questions_for_user }` before Q&A. Questions only from unresolved gaps (max 3).  
Acceptance:
- Adjacent matches require honest_framing field
- real_gaps never auto-filled in tailor prompt
- UI shows gap summary before questions

---

## Task 102 — Tracked changes accept/decline (spec §3.6)
Status: PENDING  
Scope: `components/tailor/TailorDiff.tsx`, `app/dashboard/tailor/[id]/page.tsx`, `types/index.ts`, optional new API route for feedback  
Goal: Per-change Accept / Decline / Edit; decline captures reason; partial accept updates `structured_data` before export.  
Acceptance:
- Accept all / Decline all at top
- Declined changes excluded from export
- Feedback stored on `tailored_resumes` or new `change_feedback` jsonb column

---

## Task 103 — Job fetch: Workday + LinkedIn handling (spec §2.1)
Status: PENDING  
Scope: `lib/jobs/job-scraper.ts`, `components/jobs/JobHub.tsx` or job input UI, tests  
Goal: Workday internal API parser; detect LinkedIn URLs → force paste mode with clear message.  
Acceptance:
- Workday URL returns full JD text
- LinkedIn URL never silently fails
- Tests for URL detection

---

## Task 104 — GitHub OAuth + repo sync (spec §1.2)
Status: PENDING  
Scope: new `app/api/github/*`, `lib/github/`, migration in `docs/supabase/migrations/`, profile UI  
Goal: Connect GitHub, pull repo metadata, store in `profiles.github_data`, cross-ref projects.  
Blocked by: GitHub OAuth app + Supabase provider setup (user action)

---

## Task 105 — Applications schema migration (spec §4.1)
Status: PENDING  
Scope: `docs/supabase/migrations/`, `types/index.ts`, `lib/supabase/queries.ts`, jobs UI  
Goal: Add `applications` + `application_events` tables; migrate existing `jobs` rows; keep reads working.  
Note: Additive migration only. Do not drop `jobs` until app code switched.

---

## Task 106 — Visual render QA pass (spec §3.5)
Status: PENDING  
Scope: `lib/export/pdf-generator.tsx`, new `lib/resume/layout-check.ts`  
Goal: After tailor, run length + placeholder + section checks; surface flags in UI before export.

---

## Backlog (Phase 2+)

- Gmail daily scan + status inference
- Fit score on application cards
- Kanban pipeline view
- Playwright fallback for generic job URLs
- OCR for scanned PDFs
- Deprecate or hide cover letter from primary nav
