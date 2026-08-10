# HireIQ Architecture

**Last updated:** 2026-08-09  
**Spec:** [SPEC.md](./SPEC.md) v1.0

## Product focus (v1.0 spec)

Two pillars only:

1. **Tailor a resume** — JD + profile → tailored resume with tracked accept/decline changes
2. **Track applications** — job log, Gmail scan (Phase 2), single clean view

Cover letter, outreach, and interview prep exist in the codebase but are **out of Phase 1 scope** per the new spec.

### Primary navigation (IA reset)

| Place | Route | Notes |
|-------|--------|-------|
| Dashboard | `/dashboard` | Hub tiles |
| Applications | `/dashboard/tracker` | Teal tracker |
| Resume Builder | `/dashboard/builder` | Library only; master edits on Profile |
| Profile | `/dashboard/profile` | Account icon — unified master (docs + content + pending) |

Shell: `components/shared/{DashboardShell,Sidebar,MobileNav,primary-nav.ts}`.

Profile: `components/profile/ProfileHome.tsx` (+ shared save/nav/panel). Legacy `/profile/documents`, `/profile/professional`, `/builder/master` redirect. Builder library: `components/builder/ResumeLibrary.tsx`. Job Teal chrome: Applications → Documents (JobMatcherPanel).

### Chrome extension (Module 6)

- `extension/` — MV3 + Vite/CRXJS; Jobright-style right panel (autofill + save)
- **Preferred auth:** website connect — popup opens `/extension/connect` → one-time `hiqc_` code (`extension_connect_codes`) → extension stores Supabase access/refresh tokens
- Fallbacks: `chrome.identity` Google OAuth, legacy `hiq_` API tokens (`api_tokens`)
- ATS account email: `applications.ats_account_email` when employer site needs signup (user creates account; we store email only)
- Docs: [EXTENSION.md](./EXTENSION.md)

---

## Repo layout

```
HireIQ/
├── app/              # Next.js routes (pages + API)
├── components/       # UI by feature
├── lib/              # Business logic (no React)
├── proxy.ts          # Next.js 16 auth proxy (session refresh + route guards)
├── store/            # Zustand client state
├── types/            # Shared TypeScript types
├── docs/             # Everything non-runtime (this folder)
│   ├── SPEC.md
│   ├── ARCHITECTURE.md / STATUS.md / TASKS.md / DECISIONS.md / CHANGELOG.md
│   ├── AUTH.md
│   ├── prototype/    # HTML design explorations
│   ├── scripts/      # Playwright UI audit, dev utilities
│   └── supabase/     # SQL migrations (run manually in Supabase)
└── README.md         # Minimal pointer → docs/
```

**Rule:** `main` holds application code only. Planning, migrations, prototypes, and scripts live under `docs/`.

---

## Data flow (current implementation)

```
Auth (Supabase)
    → proxy.ts refreshes session; guards /dashboard/*
    → app/(auth)/login|signup|forgot-password|reset-password
    → app/auth/callback → lib/auth/profile-sync.ts

Upload PDF/DOCX
    → app/api/resume/parse
    → Claude (PROMPT 1) → resumes.structured_data JSONB
    → optional sync → profiles.profile_data (sectioned profile UI)

Paste JD or job URL
    → lib/jobs/url-detect.ts (Greenhouse / Lever / Ashby / Workday / LinkedIn block / aggregators)
    → app/api/jobs/fetch-url → lib/jobs/job-scraper.ts
    → app/api/jobs/analyze → Claude (PROMPT 2) → jobs.extracted_data JSONB

Tailor flow (Zustand store, 5 steps)
    → app/api/tailor/score     → lib/scoring/ats-scorer (no AI)
    → app/api/tailor/questions → lib/ai/gap-analysis.ts + Claude (PROMPT 3) → 3-tier gaps + max 3 questions
    → GapAnalysisSummary UI on step 4 before Q&A
    → app/api/tailor/generate  → lib/ai/tailor-pipeline.ts → tailored_resumes + changes JSONB
    → app/api/tailor/[id]/decisions → lib/tailor/change-decisions.ts (accept/decline/edit per change)
    → Job Hub Changes tab → components/tailor/TailorDiff.tsx
    → app/api/export/pdf|docx  → approved resume only; blocks if changes pending
    → app/api/tailor/cover-letter (Phase 1+ extra — not in new spec MVP)

Application tracking
    → applications + application_events (migration 010; 1:1 with jobs)
    → status API writes event + mirrors jobs.application_status
    → Applications home: Table | Board (Kanban drag)
    → Full-page detail: Overview | Job description | Documents | Questions | Activity | Email
    → Activity adapter merges status/manual/email-linked events with legacy email log entries
    → Manual inbox reads bounded applications.email_log JSONB through a provider-neutral view model
    → Future Gmail sync uses dedicated message storage, then adapts into the same inbox view model
    → Fixed-job Documents editor: profile_data → inclusion filter → live preview/score → tailored_resumes
    → Gmail scan / forward-to-save (Phase 2)
```

---

## Module map: spec → code

| Spec module | Target | Current location | Status |
|-------------|--------|------------------|--------|
| **1 Profile Engine** | | | |
| 1.1 Resume parse | Tiered skills + confidence flags | `app/api/resume/parse`, `lib/ai/prompts.ts`, `resumes.structured_data` | 🟡 Partial — no OCR, skills not tiered core/familiar/tools |
| 1.2 GitHub OAuth | `profiles.github_data` | `lib/github/*`, `app/api/github/*`, Profile Projects UI | ✓ Built — enable provider + migration 008 |
| 1.3 Profile schema | Normalized tables | `profiles.profile_data` JSONB + `resumes` | 🟡 JSONB-first; normalized tables deferred (see DECISIONS) |
| **2 Job Ingestion** | | | |
| 2.1 Fetch JD | Workday, GH, Lever, Ashby, LinkedIn paste | `lib/jobs/url-detect.ts`, `lib/jobs/job-scraper.ts` | 🟡 GH/Lever/Ashby/Workday ✓; LinkedIn → paste; Playwright fallback pending |
| 2.2 JD extraction | `key_phrases`, `ats_keywords`, posting age | `lib/jobs/normalize-job.ts`, `JobExtractedData` | 🟡 Partial — missing key phrase frequency, posting age |
| **3 Tailoring** | | | |
| 3.1 Gap analysis | 3-tier direct/adjacent/gap JSON | `lib/ai/gap-analysis.ts`, `app/api/tailor/questions` | ✓ Built — summary UI + prompt injection |
| 3.2 User questions | Max 2–3, evidence-based | `components/tailor/QuestionFlow.tsx` | ✓ Built |
| 3.3 Resume build | Role-based section order, bullet rules | `lib/ai/tailor-pipeline.ts`, `tailor-engine.ts` | 🟡 Critique loop exists; section order not role-aware |
| 3.4 ATS check | 70%+ keywords, density, format | `lib/scoring/ats-scorer.ts` | ✓ Built — weights differ from spec checklist |
| 3.5 Visual render | PDF length/layout checks | `lib/export/pdf-generator.tsx` | 🟡 Export only; no automated layout QA (Task 106) |
| 3.6 Tracked changes | Accept / decline / edit per change | `TailorDiff.tsx`, `change-decisions.ts`, Job Hub Changes tab | ✓ Built — export gated on review |
| **4 Application tracker** | | | |
| 4.1 Schema | `applications` + `application_events` | migration 010 + status APIs | ✓ Backfill + events; jobs status mirrored |
| 4.2 Tracker UI | Kanban + list + detail | `ApplicationsTracker`, Board/List, JobHub | ✓ Table default + Board drag; timeline Phase 2 |
| 4.3 Gmail | Daily scan, status inference | — | 🔴 Phase 2 — not built |
| **Auth** | Session + route guards | `proxy.ts`, `app/(auth)/*`, migration 007 | ✓ Email + Google; reset password; profile names |

Legend: ✓ done · 🟡 partial · 🔴 not started

---

## Tech stack (actual vs spec)

| Layer | Spec | Repo |
|-------|------|------|
| Framework | Next.js 15 | Next.js 16 (App Router + `proxy.ts`) |
| DB / Auth | Supabase | Supabase ✓ |
| AI | Claude Sonnet + Haiku | Anthropic via Vercel AI SDK ✓ |
| PDF export | Puppeteer/Playwright | `@react-pdf/renderer` (Vercel-friendly) |
| Job scrape | Playwright fallback | Cheerio + public APIs + Workday internal API |
| Background jobs | Edge Functions + pg_cron | Not set up |

---

## Key directories (runtime code)

| Path | Responsibility |
|------|----------------|
| `proxy.ts` | Supabase session refresh; `/dashboard/*` auth guard |
| `lib/ai/` | Prompts, gap analysis, tailor pipeline, critique/retry loop |
| `lib/auth/` | Auth messages, profile sync after OAuth |
| `lib/tailor/` | Change decisions (accept/decline/edit) |
| `lib/profile/` | Profile JSONB ↔ resume sync, provenance, bullets |
| `lib/jobs/` | URL detect, scrape, job normalization, status labels |
| `lib/applications/` | Application status updates + event writes |
| `components/jobs/detail/` | Focused full-page tracker detail panels and documents workspace |
| `lib/scoring/` | Deterministic ATS scorer |
| `lib/export/` | PDF + DOCX generation |
| `lib/supabase/` | Browser/server clients, query helpers |
| `components/tailor/` | Stepper, gap summary, Q&A, diff, match score |
| `components/profile/` | Full profile workspace (Sprout-style) |
| `components/jobs/` | Tracker (Table/Board), Job Hub / application detail |
| `components/auth/` | Shared auth shell for login/signup/reset |

---

## Database (current)

Migrations in `docs/supabase/migrations/` (001 → 010):

| Table | Role |
|-------|------|
| `profiles` | User + `profile_data` JSONB; `resume_theme` (009); first/last name from signup trigger (007) |
| `resumes` | Uploads + `structured_data` |
| `jobs` | JD storage + `application_status` / `tailoring_status` (mirrored from applications) |
| `applications` | 1:1 tracker row per job (010) |
| `application_events` | Status/timeline events (010) |
| `tailored_resumes` | Output + `changes` + `change_decisions` + `theme_override` |
| `resume_enhancements` | Legacy Q&A storage |
| `notifications` | In-app alerts |
| `github_connections` | GitHub OAuth tokens (008) |

**Remote (Supabase project `wsbbgznobxhjefaqbniv`):** Core schema + RLS applied. Migrations 006–010 applied via MCP.

Spec target still pending: normalized `experiences`/`projects`/`skills`, Gmail columns on `profiles`.

---

## Verification

- **Tests:** 96 passing (`npm run test`)
- **Typecheck:** `npx tsc --noEmit`
- **Auth setup:** [AUTH.md](./AUTH.md)
