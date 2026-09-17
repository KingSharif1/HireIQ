# Job resume edit & tailor (Tasks 152, 158, 159, 162)

How HireIQ tailors a resume for one job and how the Documents **Edit** workspace works after this ship.

**Shipped:** PR [#19](https://github.com/KingSharif1/HireIQ/pull/19) (Task 152 Edit/Match) · Task 158 markdown wire/streaming · Task 159 one-page curation/export · Task **162** in progress
**Goal:** Maximize interview chance — pass **ATS** and look strong to a **human recruiter**, while still sounding like the candidate.

**Bar (2026-09-17):** the [Red Hawk Claude tailor](https://claude.ai/chat/c41aa0eb-7afd-4008-9143-8e27c3bb57d0) — draft immediately, restructure around the posting’s thesis, map real projects, never invent missing tools.

---

## Target pipeline (Task 162 — not fully wired yet)

```
POST /api/tailor/runs
  → load full master resume + JD + GitHub from DB
  → ATS pre-scan (no Claude quiz)
  → 1 streamed markdown rewrite (thesis + restructure + honest language)
  → save tailored_resumes + optional leftover chips (max 2)
  → status: needs_review
  → optional: user adds a real example → 1 weave (call 2 of 2)
  → skip chips → leave those tools off, no extra call
```

**Live on prod today** already has Task 159’s stricter one-page curation, full Profile context, markdown model I/O, and streamed progress. It still uses the quiz-first path (`awaiting_answers` before generate). Helpers for leftover chips and projects-first section order are in `lib/tailor/ats-gap-hints.ts` and `lib/tailor/job-structure.ts`.

---

## Current pipeline (until Task 162 is wired)

```
POST /api/tailor/runs
  → load full master resume + JD + GitHub from DB
  → ATS pre-scan
  → if gaps: 1 gap-analysis pass
       · if that returns 0 questions → ATS fallback questions (max 3)
  → status: awaiting_answers
  → 1 rewrite (ATS + recruiter, still their voice, no inventing)
  → save tailored_resumes + changes
  → status: needs_review
```

Leave or refresh: attach to the same run. Failed runs stay failed until the user taps Try again.

UI: calm wait (“Reviewing this job” / “Writing a version in your voice”). No call counts or model names. Errors show on the wait card + Details.

| Rule | Detail |
|------|--------|
| Cost | Max **2** Claude calls; `maxRetries: 0`; no critique loop |
| Honesty | Never invent tools / metrics; Q&A is first-class evidence |
| Projects | Prefer JD-relevant projects only on the tailored snapshot |
| Decisions | **New additions** → pending (Accept/Remove). Rewrites of existing text → auto-accepted |

Code: `lib/tailor/execute-run.ts`, `ats-gap-hints.ts`, `lib/ai/tailor-pipeline.ts`, `lib/ai/prompts.ts`.

---

## Documents → Edit workspace

Three tabs (desktop **and** mobile): **Content** · **Design** · **Match**.

### Content
- **Edit** button on every field (always visible on mobile — no hover dependency).
- Editable: name, email, phone, location, title, summary, company/role, bullets, skills, projects, certs.
- Checkboxes = include / exclude on **this job’s** resume only (master profile not written).
- **New** badge on brand-new tailor additions.
- Teal highlight on rows that correlate with the selected Match change / preview highlight.

### Design
- Size templates: Compact / Standard / Spacious.
- Mobile: **Styling**, **Sections**, **Settings** (Advanced hidden).
- Desktop: full Presentation + Advanced.

### Match
- Job match % + keyword/skill breakdown.
- Plain-language **interview odds** brief (`optimization-brief.ts`).
- What was updated: before → after + reason.
- Tap a change → highlight on preview; on mobile also switches to Preview pane.
- Accept / Remove only when the change is a **new addition**.

### Preview
- Live from the edited snapshot + inclusion map.
- Teal highlights for tailored / selected changes (`ResumePreview` `highlights` prop).
- Declined new additions are reverted via `buildApprovedResume` before display/save.
- Default layout: **categorized skills**, Summary→Skills→Experience→Projects→Education→Certs; education lines never double-append “in Field”.

Code: `JobResumeEditor.tsx`, `ContentEditor.tsx`, `EditableText.tsx`, `AnalyzerPanel.tsx`, `DesignerPanel.tsx`, `ResumePreview.tsx`.

---

## Master profile export (Task 159)

Profile → **DOCUMENTS → Export PDF**: pick sections, reorder, Compact/Standard/Spacious, download. Uses `POST /api/export/pdf` with `source: 'master'`. Does not change the master profile.

---

## Job-optimized pull from master

When opening Edit with **no** tailored version yet:

`buildJobOptimizedInclusion(master, job)` keeps experience/education, but only projects/skills that score against the JD (`lib/tailor/job-relevance.ts`). That improves ATS density without inventing experience.

---

## Data written

| Table / field | Role |
|---------------|------|
| `tailored_resumes.structured_data` | Current approved snapshot for this job |
| `original_structured_data` | Pre-tailor baseline for diffs |
| `changes` | Diff rows (+ ids) |
| `change_decisions` | Accept / decline / edit per change |
| `inclusion` | Include/exclude map |
| `theme_override` | Visual theme for this job |
| `match_score` / `tailored_score` | ATS totals |

Master `profiles.profile_data` is **not** updated from this editor.

---

## Smoke after deploy

1. Hard-refresh a job → Documents → Edit — see **Edit** buttons, Design on mobile, Match odds copy.
2. AI tailor on a job with skill gaps — expect 1–3 questions, then one rewrite.
3. Match → tap a change → preview highlights; Accept only on **New** rows.
4. Save & score — `tailored_resumes` updates for that job only.
