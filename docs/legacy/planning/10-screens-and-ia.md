# 10 — Screens & Information Architecture

> Every screen in v1: layout, components, and what data it shows.
> Simpler than Sprout (2-pane, not 3). Last updated: 2026-06-14

## Navigation (target)

| Nav item | Route | Notes |
|----------|-------|-------|
| **Applications** | `/dashboard` | Job tracker list — Q23 |
| **Alerts** | `/dashboard/notifications` | Unread badge (Phase 4) |
| **Tailor** | `/dashboard/tailor` | Quick-start tailor or pick job |
| ~~Resumes~~ | `/dashboard/profile?section=resumes` | **Removed from main nav** (Q19) |
| ~~Jobs~~ | `/dashboard/jobs` | Add job flow; list merged into Applications |
| **Profile** | `/dashboard/profile` | Sidebar footer link |

**Current code (2026-06-14):** Sidebar = Applications · Alerts · Tailor · Profile footer. See `14-sprout-ui-gap.md`.

---

## Screen: Applications dashboard (`/dashboard`)

**Purpose:** Central job tracker (Q23).

### Layout
- Page title: "Applications"
- Filter/sort: tailoring status, application status, date added
- Job cards or table rows

### Each job row shows
| Field | Source |
|-------|--------|
| Title + company | `jobs` |
| Fit score | latest `tailored_resumes.match_score` or live score |
| Tailoring status | derived (see `08-v1-product-spec.md`) |
| Application status | `jobs.application_status` (+ email suggestions) |
| Last updated | `jobs.updated_at` |
| Quick action | "Continue" / "Review docs" / "Tailor" |

### Empty state
"No applications yet. Add a job to get started." → CTA to add job.

---

## Screen: Add job

**Route:** `/dashboard/jobs/new` or modal from dashboard.

- Paste job description **or** URL (fetch JD if possible)
- Optional: company, title, location (auto-filled from analyze)
- Submit → analyze → create `jobs` row → redirect to job detail

---

## Screen: Job detail (`/dashboard/jobs/[id]`)

**Purpose:** Single job hub (Q24, Q25). **2-pane layout** — simpler than Sprout's 3-pane.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back    Software Engineer @ Ascension          [Tailor again] │
├──────────────────────────────┬──────────────────────────────────┤
│                              │  JOB SIDEBAR (collapsible)        │
│  MAIN CONTENT                │  ┌─────────────────────────────┐ │
│  (tabs)                      │  │ Job Fit Score    7.5/10     │ │
│                              │  ├─────────────────────────────┤ │
│  [Documents] [Questions]     │  │ Job details (accordion)     │ │
│  [Timeline] [Credentials]    │  │  title, company, location   │ │
│                              │  │  salary, remote, View orig  │ │
│                              │  ├─────────────────────────────┤ │
│                              │  │ Application details         │ │
│                              │  │  tailoring status           │ │
│                              │  │  application status         │ │
│                              │  │  masked email (copy)        │ │
│                              │  │  created / updated          │ │
│                              │  └─────────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────────┘
```

### Tab: Documents (default)

Inspired by Sprout DOM user pasted; our version:

**Header row:**
```
[Resume] [Cover Letter]     v2 ▾    [Edit] [Regenerate 2/3] [Export ▾]
```

- **Resume / Cover Letter** — tab switch
- **Version dropdown** — v1, v2, v3 with timestamps
- **Edit** — inline edit of current version (marks `user_edited`)
- **Regenerate** — new tailor run; shows `N/3 used` (Q34)
- **Export** — PDF, DOCX (Q26)

**Main body:**
- Rendered resume preview (paginated, WYSIWYG-ish)
- Below or beside: **Change summary** vs master profile
  - Added bullets (green)
  - Changed bullets (amber)
  - Removed/hidden bullets (muted, "omitted from this version")
  - Section reorder note if applicable

**Empty state:** "No resume yet" + CTA Tailor.

### Tab: Questions

Shows the tailor Q&A loop:
| Column | Content |
|--------|---------|
| Question | What AI asked (`GapQuestion`) |
| Your answer | User's response |
| What we used | Bullet or skill added to tailored snapshot |
| Write-back | Link to pending suggestion if any |

Data: store `gap_answers` JSON on job or tailor run (new — see data model).

### Tab: Timeline

Chronological events:
- Job added
- Tailor v1 generated
- User exported PDF
- Email: "Application received" (parsed)
- Email: "Interview invite"
- Status changed to Interview

Source: `job_events` + `job_email_events` tables.

### Tab: Credentials (conditional)

Only when portal account exists (v2 auto-apply) or user manually saves credentials.

Sprout-style card:
- Masked email used
- Generated password (show/copy)
- Security note

**v1:** show masked email here; full credentials card ships with v2 auto-apply (Q31). v1 can show "Use this email when applying."

---

## Screen: Profile (`/dashboard/profile`)

**Exists today.** Sprout-inspired sectioned workspace.

### Inner nav groups
| Group | Sections |
|-------|----------|
| PROFILE | Personal Info |
| DOCUMENTS | Resumes (uploads, max 3), Additional Documents |
| PROFESSIONAL | Summary, URLs, Experience, Volunteering, Projects, Education, Skills & Certs, Achievements, Additional |

### Features
- Count badges per section
- Completeness meter (top)
- Sticky save/review bar
- Pending suggestion badges per section (Phase 4)
- Provenance coloring on bullets from tailor (Phase 3)

### Uploaded resume detail (in Documents → Resumes)
- **Default:** original PDF/DOCX preview (Q22)
- **Toggle:** parsed structured data
- **On re-upload:** diff view — highlight new content (Q21)
- Actions: delete, view, "merge new content into profile"

---

## Screen: Tailor (`/dashboard/tailor`)

Multi-step wizard (exists; updating).

| Step | Content |
|------|---------|
| 1 | Confirm master profile (summary + link to edit) |
| 2 | Select job (or pre-selected from job detail) |
| 3 | Fit score breakdown |
| 4 | Gap questions |
| 5 | Generating… (progress) |
| 6 | Done → redirect to job Documents tab |

---

## Screen: Notifications (Phase 4)

- Accessible from sidebar badge
- List: unread first
- Types: suggestion, tailor complete, email status
- Click → deep link

---

## Screen: Auth (`/login`, `/signup`)

- Themed `bg-background`
- Google button (basic scope)
- Email/password

---

## Responsive behavior

| Breakpoint | Job detail |
|------------|------------|
| Desktop | 2-pane: main + right sidebar |
| Tablet | Sidebar collapses to drawer |
| Mobile | Single column; sidebar becomes bottom sheet or stacked accordions |

Mobile nav (`MobileNav`) mirrors sidebar items (minus Resumes after Q19).

---

## Component inventory (to build)

| Component | Phase | Used on |
|-----------|-------|---------|
| `JobCard` | 5 | Dashboard |
| `JobDetailLayout` | 5 | Job detail |
| `DocumentPanel` | 5 | Job detail Documents tab |
| `VersionSelector` | 5 | Document panel |
| `ChangeSummary` | 5 | Document panel (needs Phase 2 diffs) |
| `RegenerateButton` | 5 | Document panel |
| `ExportMenu` | 5 | Document panel |
| `MaskedEmailCard` | 5 | Job sidebar |
| `JobTimeline` | 5 | Job detail Timeline tab |
| `QuestionsReview` | 5 | Job detail Questions tab |
| `UploadDiffReview` | 5 | Profile resume detail |
| `OriginalFilePreview` | 5 | Profile resume detail |
| `PendingSuggestionInline` | 3–4 | Profile sections |
| `ProvenanceBadge` | 3 | Profile bullets |

---

## Routes (target)

```
/dashboard                    Applications list (tracker)
/dashboard/jobs/new           Add job
/dashboard/jobs/[id]          Job detail (tabs)
/dashboard/tailor             Tailor wizard
/dashboard/tailor/[id]        Tailor for specific job (exists)
/dashboard/profile            Profile workspace
/dashboard/profile?section=…  Deep link to section
/login, /signup               Auth
```

**Deprecated routes (remove or redirect):**
- `/dashboard/resume` → redirect to `/dashboard/profile?section=resumes`
- `/dashboard/resume/upload` → profile documents upload
- `/dashboard/resume/[id]` → profile resume detail view
