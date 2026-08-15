# Resume Builder — current map + next-session brief

**As of:** 2026-08-15 · **Task 153** Profile rail + Builder files-by-job

---

## Current routes

| Route | Role |
|-------|------|
| `/dashboard/profile` | **Master resume + autofill** — one section at a time |
| `/dashboard/builder` | Uploads + tailored resumes **grouped by job** |
| `/dashboard/builder/master` | Redirect → Profile (or tracker if `jobId`) |
| `/dashboard/profile/documents` | Legacy redirect → Profile documents section |
| `/dashboard/profile/professional` | Legacy redirect → Profile |
| `/dashboard/resume/upload` | Upload / parse flow |
| `/dashboard/resume/[id]` | Resume detail |
| `/dashboard/tracker/[id]?tab=documents` | Per-job Teal editor (Content / Design / Match + preview) |

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

## Suggested direction for Task 146

**Shipped 2026-08-13:** option 1 — one Resume Builder primary nav (Master resume + Files & versions). See DECISIONS 2026-08-13.

Remaining: optional scroll-all-sections instead of the section carousel; live preview beside master.

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
