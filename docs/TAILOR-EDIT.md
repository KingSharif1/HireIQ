# Job resume edit & tailor (Task 152)

How HireIQ tailors a resume for one job and how the Documents **Edit** workspace works after this ship.

**Shipped:** PR [#19](https://github.com/KingSharif1/HireIQ/pull/19) · branch `cursor/better-tailor-edit-d22e`  
**Goal:** Maximize interview chance — pass **ATS** and look strong to a **human recruiter**, while still sounding like the candidate.

---

## Tailor pipeline (durable, max 2 Claude calls)

```
POST /api/tailor/runs
  → load full master resume + JD + GitHub from DB (0 Claude)
  → ATS pre-scan (skills / keywords)
  → if gaps: 1 Claude gap analysis
       · if Claude returns 0 questions → ATS fallback questions (max 3)
  → status: awaiting_answers (user answers)
  → 1 Claude rewrite (ATS + recruiter voice, no inventing)
  → save tailored_resumes + changes + change_decisions
  → status: needs_review
```

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

Code: `JobResumeEditor.tsx`, `ContentEditor.tsx`, `EditableText.tsx`, `AnalyzerPanel.tsx`, `DesignerPanel.tsx`, `ResumePreview.tsx`.

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
