# Job resume edit & tailor (Tasks 152, 158, 159, 162)

How HireIQ tailors a resume for one job and how the Documents **Edit** workspace works after this ship.

**Shipped:** PR [#19](https://github.com/KingSharif1/HireIQ/pull/19) (Task 152 Edit/Match) · Task 158 markdown wire/streaming · Task 159 one-page curation/export · Task **162** draft-first + optional chips
**Goal:** Maximize interview chance — pass **ATS** and look strong to a **human recruiter**, while still sounding like the candidate.

**Bar:** Draft immediately from Profile + GitHub + JD; restructure around the posting’s thesis; map real projects; never invent missing tools. Optional leftover chips after the draft only.

**Quality bar vs Claude (Emerson bake-off):** [TAILOR-QUALITY.md](./TAILOR-QUALITY.md) — Claude still wins on thesis + project promotion + skill honesty; P0–P1 plan + first OSS GitHub survey live there.

---

## Pipeline (Task 162)

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

Legacy `awaiting_answers` runs (pre-162) still continue via the continue route.

Leave or refresh: attach to the same run. Failed runs stay failed until the user taps Try again.

UI: calm wait (“Reviewing this job” / “Writing a version in your voice”). Optional tips sit above the review diff. No call counts or model names. Errors show on the wait card + Details.

### Review overlay (Tasks 170–171)

Desktop `AiTailorFlow` review is a **split viewport**, not one tall scrolling page:

| Pane | Width | Behavior |
|------|--------|----------|
| Left (score + `TailorDiff`) | ~30% | Independent `overflow-y` scroll |
| Right (`ResumePreview`) | ~65–80% | Sticky within overlay height; live `approvedPreview` |

- Hover/focus a change → teal highlight on the matching preview region (`highlightsFromChanges` / `ResumePreview` `highlights`, same as Documents Match).
- **Task 171 cards:** section title + action (Updated/Added), plain **Why** line, short text preview, and **± match pts** for keeping that change (`scoreImpactForChange`). **Show before / after** expands the full diff + keywords/skills gained or lost. Edit → Save recalculates that delta and the live header score.
- Pending: Accept / Decline / Edit (`aria-label`s). Decided: status + **Undo**; accepted/edited keep Decline/Edit. Decline is **one tap**.
- Mobile: score+diff scroll; preview behind a toggle (capped height).

| Rule | Detail |
|------|--------|
| Cost | Max **2** Claude calls (draft + optional weave); no pre-draft gap call; `maxRetries: 0` |
| Honesty | Never invent tools / metrics; chip answers are first-class evidence |
| Order | Draft first; chips never block the first version |
| Projects | Prefer JD-relevant projects only on the tailored snapshot |
| Decisions | **New additions** → pending (Accept/Remove). Rewrites of existing text → auto-accepted |

Code: `lib/tailor/execute-run.ts`, `ats-gap-hints.ts`, `lib/ai/tailor-pipeline.ts`, `lib/ai/prompts.ts`, `lib/scoring/tailored-rescore.ts`, `components/tailor/TailorDiff.tsx`.

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

## Master profile export (Tasks 159 / 165)

Profile → **Resumes**: **Export PDF** on the resume card opens a large dialog. Pick sections, reorder, Compact/Standard/Spacious; desktop shows a live zoomable page preview (`ResumePreview`, `fitAxis="width"`). Uses `POST /api/export/pdf` with `source: 'master'`. Does not change the master profile. Old `?section=exportResume` bookmarks land on Resumes. Full Profile hub: [PROFILE-MASTER.md](./PROFILE-MASTER.md).

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
2. AI tailor on a job with skill gaps — draft first, then ≤2 optional leftover chips (not a pre-draft quiz).
3. Match → tap a change → preview highlights; Accept only on **New** rows.
4. Save & score — `tailored_resumes` updates for that job only.
5. Emerson-class (embedded/hardware) jobs: lead project + skill honesty should match [TAILOR-QUALITY.md](./TAILOR-QUALITY.md) acceptance bar.
