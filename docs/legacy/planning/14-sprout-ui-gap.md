# 14 — Sprout UI: What Matches vs What’s Left

> Honest map between Sprout-inspired target (Q19, Q23, `12-sprout-research.md`) and the app **today**.
> Last updated: 2026-06-14

## Navigation (Sprout target)

| Sprout pattern | HireIQ target (Q19) | Status |
|----------------|---------------------|--------|
| Applications hub | `/dashboard` renamed **Applications** | ✅ Shell — job cards, add job CTA |
| Tailor entry | `/dashboard/tailor` | ✅ |
| Alerts / notifications | `/dashboard/notifications` + badge | ✅ (needs migration 004) |
| Profile in footer | `/dashboard/profile` sidebar footer | ✅ |
| ~~Resumes top nav~~ | Resumes under Profile → Documents | ✅ Removed from main nav |
| ~~Jobs top nav~~ | Merged into Applications | ✅ Removed from main nav |

**Still at old routes (intentional):** `/dashboard/resume`, `/dashboard/jobs` — reachable via Profile and Add job.

---

## Profile (`ProfileWorkspace`)

| Sprout | HireIQ | Status |
|--------|--------|--------|
| GROUPED sidebar (PROFILE / DOCUMENTS / PROFESSIONAL) | Same section groups | ✅ |
| Section count badges | Completeness + counts + pending amber on Experience | ✅ |
| Single-column forms | Section panels | ✅ |
| Review pending inline | `PendingSuggestionsPanel` + provenance tint | ✅ Experience only |

**Gap:** Projects/volunteering provenance editors not wired yet.

---

## Job detail (Sprout 3-pane → our 2-pane)

| Sprout | HireIQ v1 target | Status |
|--------|-------------------|--------|
| Documents tab (Resume / Cover, versions) | Per-job document panel Q34 | ✅ Built (`JobHub`) |
| Download preview | WYSIWYG `ResumePreview` matching PDF | ✅ Built |
| Questions tab | Gap Q&A from tailor run | ✅ Built |
| Right sidebar: fit score, job details, app status | 2-pane job detail | ✅ Built |
| Regenerate cap 3 | Not enforced yet | ⬜ Phase 5 cont. |
| Change summary vs master in Documents | Reuse `TailorDiff` | ⬜ Phase 5 cont. |
| Masked email copy | Masked inbox Q32 | ⬜ Phase 5 cont. |

**Today:** Clicking a job on Applications opens the full 2-pane hub at `/dashboard/jobs/[id]`.

---

## Applications list

| Sprout | HireIQ | Status |
|--------|--------|--------|
| Job cards with status | Basic cards: tailored / not started + fit % | 🟡 Partial |
| Application status column | `jobs.application_status` | ⬜ Phase 5 |
| Tailoring status derived | From `tailored_resumes` presence | 🟡 Partial |
| Email timeline on job | `job_email_events` | ⬜ Phase 5 |

---

## Resume management

| Sprout | HireIQ | Status |
|--------|--------|--------|
| Upload seeds master profile | Parse → `profile_data` | ✅ |
| Soft cap 3 uploads | Not enforced | ⬜ Phase 5 |
| Delete upload | `DELETE /api/resume/[id]` + trash on list | ✅ |
| Re-upload diff merge | Not built | ⬜ Phase 5 |

---

## What to expect next (Phase 5)

1. **Job detail page** `/dashboard/jobs/[id]` — 2-pane, Documents + Questions + sidebar
2. **Document versions** — v1/v2, change summary, regenerate cap
3. **Status columns** on `jobs` — application + tailoring status
4. **Masked inbox** — copy alias on apply
5. **Final UI polish** — micro-animations, cross-theme QA

---

## Mental model

- **Profile** = Sprout-style master career record (closest match today)
- **Applications** = where jobs live (replacing separate Home + Jobs nav)
- **Tailor** = engine + result pages (working; fit score NaN fixed 2026-06-14)
- **Job hub** = biggest remaining Sprout gap — Phase 5
