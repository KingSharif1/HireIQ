# STATUS — Where We Are Right Now

> **⚠️ Legacy / archived (2026-06-14).** Do not use this file for current state.  
> **Read instead:** [docs/STATUS.md](../../STATUS.md) · [docs/TASKS.md](../../TASKS.md)

> **Read this first** after `README.md`. Updated when reality changes.
> Last updated: **2026-06-14**

## System (one line)

HireIQ turns a user's real career profile into job-specific, honest, ATS-optimized resumes — with tracking from tailor → apply → interview.

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Planning & docs | ✅ **Complete** | Full v1 spec + Sprout gap doc (`14-sprout-ui-gap.md`) |
| 1 — Profile-as-master + theme | ✅ **Complete** | 20 tests + manual QA |
| 2 — Tailor engine | ✅ **Complete** | 36 tests + manual QA |
| 3 — Write-back + provenance | ✅ **Complete** | Experience provenance + pending suggestions |
| 4 — Notifications + badges | ✅ **Complete** | Migration 004 applied to Supabase (2026-06-14) |
| 5 — Job tracker + email + docs | 🟡 **In progress** | Job hub 2-pane + download preview + versions live; email/masked inbox pending |
| Final — UI polish | 🟡 **In progress** | P0 contrast + score colors done; P1 layout/tailor flow next |

**Overall v1 estimate:** ~50% built.

## Working on

**P1 UX overhaul** — P0 visual fixes shipped (2026-06-14): light-mode `text-foreground` on surfaces,
value-aware fit scores on Applications, `brand-purple` → `primary` token. Next: PageContainer/PageHeader,
unified Tailor flow (paste URL → analyze → Q&A → hub), Applications card polish.

## Next

1. **P1** — shared page chrome + unified Tailor flow + Applications cards (avatars, status)
2. **P2** — typography pass, Job Hub change summary, GitHub OAuth + cached repo summaries
3. Phase 5 cont. — masked inbox (Q32), upload soft-cap 3 (Q20)

## What exists in code today

| Area | State |
|------|-------|
| Auth | Supabase email + Google |
| Profile | Sprout-style `ProfileWorkspace` — **closest to Sprout layout** |
| Applications home | `/dashboard` — job list, tailored/not started badges |
| Nav | Applications · Alerts · Tailor · Profile (Resumes/Jobs removed from sidebar) |
| Tailor engine | Two-pass pipeline, tiered models, write-back suggestions |
| Write-back / provenance | Experience section: accept/decline, purple provenance |
| Notifications | Table + API + page — **migration 004 applied to Supabase 2026-06-14** |
| Resume delete | `DELETE /api/resume/[id]`, trash on resume list |
| ATS score display | Fixed NaN on tailor diff tab (year-only dates, partial job JSON) |
| Job detail 2-pane | `/dashboard/jobs/[id]` — **single home per job**; Documents/Questions tabs + collapsible sidebar (fit, status, timeline, details), inline cover-letter gen |
| Download preview | `ResumePreview` — WYSIWYG mirror; **discrete page sheets** + page count + zoom + **resume-health linter** |
| Polish pass | `lib/format/normalize.ts` (name casing, preview + exports) + `lib/resume/health.ts` (ATS checks). Tailor engine still text-only (vision = v2) |
| Cover letter | Inline generation + **PDF/DOCX download** (`type:'cover'` on export routes) |
| Resume management | **Profile → Resumes** — inline view-original / replace / delete; `/dashboard/resume` redirects here |
| Document versions | `tailored_resumes.version` + version dropdown in job hub |
| Nav / shell | `DashboardShell` — **collapsible** sidebar (persisted) + profile dropdown w/ avatar (sign out lives here) |
| Tailor result page | Redirects to the job hub (consolidated) |
| Tailoring source | **Master profile only** (resume picker removed) |
| Email tracking | Not built |

## Recent changes

- **Tailor Q&A overhaul (Pass 1)** — fixed broken question data flow (real question text now reaches
  the prompt + DB + Job Hub), hybrid Q&A UI (AI quick-answer choices + example + write-your-own),
  question generator now returns `choices[]`. This is the main reason answers weren't improving the resume.
- Sprout nav alignment: Applications hub, removed Resumes/Jobs from sidebar
- MatchScore NaN fix (ATS scorer + defensive UI)
- Resume delete API + UI
- Notifications graceful error when migration missing
- `14-sprout-ui-gap.md` — honest Sprout vs HireIQ map

## Flags / risks

- **Migration 004** — notifications fail until SQL applied in Supabase
- **Sprout job hub** — user expectation vs current tailor-only flow; Phase 5 addresses
- **Anthropic billing** — tiered models matter for tailor runs
- **"View original upload"** uses `getPublicUrl` from the `resumes` storage bucket — link only opens if that bucket is public; switch to a signed URL if it's private

## Doc index

| Doc | Purpose |
|-----|---------|
| `STATUS.md` | **This file** |
| `14-sprout-ui-gap.md` | **Sprout layout: done vs remaining** |
| `08-v1-product-spec.md` | Full v1 contract |
| `10-screens-and-ia.md` | Every screen + routes |
| `05-roadmap.md` | Phased checklist |
| `06-changelog.md` | Shipped log |
| `13-phase-verification.md` | Phase gates |
