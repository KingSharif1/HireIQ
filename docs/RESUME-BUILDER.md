# Resume Builder — current map + next-session brief

**As of:** 2026-08-12 · **Next task:** [Task 146](./TASKS.md)  
**Prod:** https://hireiq.kingsharif.com · **Commit baseline:** `3c1d4f4` (+ STATUS `1b08bd2`)

Use this file as the **starting brief** for a new chat whose only job is making Resume Builder look and act like one coherent product surface.

---

## User intent (lock for next session)

> The application tracker is fine. Resume Builder should look and act how it’s supposed to. Too many pages / tabs that should live on **one page** and look better.

Do **not** expand Applications / Job Hub unless needed for redirects. Prefer grilling IA (one question at a time) before a big rewrite.

---

## What’s wrong today (pain)

| Symptom | Why |
|---------|-----|
| Two primary nav items for one mental model | **Resume Builder** (`/dashboard/builder`) + **Profile** (`/dashboard/profile`) |
| Builder is only a library | “Edit master” bounces to Profile |
| Profile is a **section carousel** | Sidebar with 13 sections — one panel at a time (feels like many pages) |
| Duplicate documents door | Library “Your resumes” ≈ Profile → Documents (`?section=resumes`) |
| Upload is a third route | `/dashboard/resume/upload` |
| Teal design chrome orphaned from “Builder” | Content / Designer / Matcher live under **Applications → job → Documents** (`JobResumeEditor`) |
| Legacy redirects still exist | `/builder/master`, `/profile/documents`, `/profile/professional` |

Prior lock ([DECISIONS 2026-08-09](./DECISIONS.md)): Profile = master; Builder = library; Teal tabs = per-job only. User is now **revisiting** that — next chat should re-grill and replace with a clearer single surface.

---

## Current routes

| Route | Role |
|-------|------|
| `/dashboard/builder` | Library: import CTA, uploaded resumes, past job versions → Profile / tracker |
| `/dashboard/builder/master` | Redirect → Profile (or tracker if `jobId`) |
| `/dashboard/profile` | Master resume: section nav + one editor panel + Save |
| `/dashboard/profile/documents` | Legacy redirect → Profile documents section |
| `/dashboard/profile/professional` | Legacy redirect → Profile professional sections |
| `/dashboard/resume/upload` | Upload / parse flow |
| `/dashboard/resume/[id]` | Resume detail |
| `/dashboard/tracker/[id]?tab=documents` | Per-job Teal editor (Content / Design / Match + preview) |

Nav: `components/shared/primary-nav.ts` — Dashboard · Applications · Resume Builder · Profile.

---

## Key components

### Master (Profile)
- `components/profile/ProfileHome.tsx` — orchestration
- `ProfileSectionNav.tsx` + `ProfileSectionPanel.tsx` — section UI
- `useProfileSave.ts` — dirty / save / pending suggestions
- `lib/profile/sections.ts` — section IDs & groups (PROFILE / DOCUMENTS / PROFESSIONAL PROFILE)
- `PendingSuggestionsPanel.tsx`, `AcceptFollowUpSheet.tsx` — master update flow

### Library
- `components/builder/ResumeLibrary.tsx`
- `app/dashboard/builder/page.tsx`

### Per-job Teal workspace (not on Builder nav)
- `components/jobs/detail/JobResumeEditor.tsx`
- `components/builder/ContentEditor.tsx`
- `components/builder/designer/DesignerPanel.tsx` (+ `SectionsTab`, `PresentationTab`, `SettingsTab`, `AdvancedTab`)
- `components/builder/JobMatcherPanel.tsx`
- Also unused / secondary: `AnalyzerPanel`, `CoverLetterPanel`, `ProfileWorkspace` (check before deleting)

### Shell / tokens
- Dashboard ink + teal: `DashboardShell`, `Sidebar`, `MobileNav`, `app/globals.css`
- Marketing (done, leave alone unless CTA links): `components/marketing/*`

---

## Data model (don’t break)

| Store | Purpose |
|-------|---------|
| `profiles.profile_data` | Structured master (sections) |
| `resumes` | Uploaded files + structured parse; same set for library + Documents |
| `tailored_resumes` | Per-job versions + scores / inclusion |
| Pending suggestions | Provenance accept/deny on Profile sections (Task 131/133) |

Data flow: upload → parse → seed/pending master → tailor from job → `tailored_resumes` → extension autofill picks resume.

---

## Suggested direction for Task 146 (not locked — grill first)

Options to interview against:

1. **One “Resume” primary nav** — merge Profile + Builder library into one page (docs + master + preview; section nav or scroll, not separate destinations).
2. **Builder owns master** — Profile becomes account-only (settings/GitHub already partly under Settings); Builder gets preview + content.
3. **Keep Profile master, kill Builder nav** — library folds into Profile Documents; rename Profile → Resume.

Whatever we pick: **one primary place** to import, edit master, see versions; fewer hops; Teal job tools can stay on Applications or fold later.

Out of scope unless asked: Google OAuth enable, Gmail sync, Chrome Store publish, landing redesign.

---

## Recently shipped (context — do not redo)

| Area | State |
|------|--------|
| Marketing landing | Ink/teal, scroll story, parallax BG, closing finale, CTA cleanup |
| Auth shell | Matches marketing |
| Dashboard shell / home | Logo teal tokens, ink sidebar, HomeTiles |
| Extension | v0.9.6 prod popup (Connected / Connect; no localhost in Store build) |
| Legal | `/privacy`, `/terms` · [GOOGLE-VERIFICATION.md](./GOOGLE-VERIFICATION.md) |

Human still owns: Supabase Google provider (Task 143), Search Console / branding re-verify, Store publish.

---

## New-chat opener (paste this)

```
System: HireIQ job-search app (Next + Supabase) | Working on: Task 146 Resume Builder UX consolidation | Next: grill IA then one-page Builder | Flags: don’t touch Applications unless redirects

Read: docs/RESUME-BUILDER.md → STATUS.md → TASKS.md (146) → DECISIONS.md (2026-08-09 Profile lock — under revisit)

Goal: Resume Builder should be one coherent page (too many tabs/pages today). Applications are fine. Wait for go-ahead after status line.
```

---

## Verify after changes

1. Code review + `ReadLints` + `npx tsc --noEmit` (+ tests if logic moves)
2. No MCP schema change expected unless we merge tables (unlikely)
3. UI: headed shots of Builder/Profile before/after — light + dark; mobile
