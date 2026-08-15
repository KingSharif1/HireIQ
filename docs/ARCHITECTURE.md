# HireIQ Architecture

**Last updated:** 2026-08-15  
**Spec:** [SPEC.md](./SPEC.md) v1.0  
**Production:** https://hireiq.kingsharif.com (Vercel · GitHub `KingSharif1/HireIQ`)

## Product focus (v1.0 spec)

Two pillars only:

1. **Tailor a resume** — JD + profile → tailored resume with tracked accept/decline changes
2. **Track applications** — job log + email activity (Gmail sync MVP Task 114; masked apply Task 139 live; mask reply-relay Task 140 v2)

Cover letter, outreach, and interview prep exist in the codebase but are **out of Phase 1 scope** per the new spec.

### Primary navigation (Task 153)

| Place | Route | Notes |
|-------|--------|-------|
| Dashboard | `/dashboard` | Hub tiles (teal shell) |
| Applications | `/dashboard/tracker` | Teal tracker — leave alone |
| Profile | `/dashboard/profile` | **Master resume + autofill identity** — one section at a time |
| Resume Builder | `/dashboard/builder` | One source upload + tailored **folders by job** (versions inside) |

Shell: `components/shared/{DashboardShell,Sidebar,MobileNav,primary-nav.ts}`.

Left nav on Profile shows one section (Personal, Experience, Projects…). Per-job Teal tabs stay on Applications → Documents. Full map: [RESUME-BUILDER.md](./RESUME-BUILDER.md).

Profile: `components/profile/ProfileHome.tsx`. Legacy `/profile/documents`, `/profile/professional`, `/builder/master` redirect here. Files tab: `ResumeLibrary`. Job Teal chrome: `JobResumeEditor`.

### Chrome extension (Module 6)

- `extension/` — MV3 + Vite/CRXJS; Jobright-style right panel (autofill + save)
- **Board adapters (v0.9.9):** Greenhouse / Lever / Ashby / Workday field maps + submit/continue/resume selectors; generic fallback otherwise
- **Preferred auth:** website connect — popup opens `/extension/connect` → one-time `hiqc_` code (`extension_connect_codes`) → extension stores Supabase access/refresh tokens
- Fallbacks: `chrome.identity` Google OAuth, legacy `hiq_` API tokens (`api_tokens`)
- ATS account email: `applications.ats_account_email` when employer site needs signup (user creates account; we store email only)
- Masked tracking: profile API overlays autofill `email` with `masked_email`
- **Auto-apply:** extension path + hosted Playwright on Cloud Run — [AUTO-APPLY.md](./AUTO-APPLY.md) · [CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md) · [PRICING.md](./PRICING.md). Queue table `apply_runs` (021); worker `services/apply-worker`; job-detail progress UI. Cloud Run deploy still ops.
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
    → app/api/jobs/analyze → Claude (PROMPT 2) via `lib/ai/runtime.ts` (HireIQ key or user BYOK) → jobs.extracted_data JSONB

Tailor flow (durable session — max 2 Claude calls, never overlapping)
    → POST /api/tailor/runs (idempotent: attach if already running)
    → DB: full resume + JD + GitHub (0 Claude)
    → Local ATS compare; if gaps → 1 Claude gap questions (ATS fallback questions if Claude returns none), then wait
    → After answers → 1 Claude rewrite for ATS + human recruiter (`lib/ai/tailor-pipeline.ts`, `maxRetries: 0`)
    → `tailor_runs` row survives refresh / navigation; tracker shows Tailoring… / Needs review
    → tailored_resumes + changes + change_decisions (new additions pending; rewrites auto-accepted)
    → Documents review → TailorDiff + Edit workspace Match highlights
    → app/api/export/pdf|docx  → approved resume only; blocks if changes pending
    → app/api/tailor/cover-letter (Phase 1+ extra — not in new spec MVP)
    Legacy POST /api/tailor/generate still exists; the job-detail AI flow uses runs.
    Doc: docs/TAILOR-EDIT.md

Application tracking
    → applications + application_events (migration 010; 1:1 with jobs)
    → status API writes event + mirrors jobs.application_status
    → Applications home: Table | Board (Kanban drag)
    → Full-page detail: Overview | Job description | Documents | Questions | Activity | Email
    → Activity adapter merges status/manual/email-linked events with legacy email log entries
    → Manual inbox reads bounded applications.email_log JSONB through a provider-neutral view model
    → Masked inbound (Resend, live): employer → mail.kingsharif.com → POST /api/webhooks/resend/inbound
      → inbound_email_events + matched email_log → All outreach / job Email (see EMAIL.md)
    → Forward-to-save (Task 115): `profiles.forward_save_email` → same webhook → extract job URL → saveJobFromUrl → tracker
    → Gmail sync (Task 114, next): Google-connected users, default on / opt-out → same email_log adapters
    → Future Gmail sync uses dedicated message storage, then adapts into the same inbox view model
    → Fixed-job Documents editor: Content (Edit) → Design → Match; live preview highlights; job-relevant inclusion from master
    → Gmail scan (Phase 2 remaining: daily cron)
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
| 3.2 User questions | Max 2–3, evidence-based; ATS fallback if Claude asks none | `QuestionFlow.tsx`, `ats-gap-hints.ts` | ✓ Built |
| 3.3 Resume build | ATS keywords in real bullets + recruiter voice; relevant projects | `tailor-pipeline.ts`, `job-relevance.ts` | ✓ One rewrite; no critique loop |
| 3.4 ATS check | 70%+ keywords, density, format | `lib/scoring/ats-scorer.ts` | ✓ Built — weights differ from spec checklist |
| 3.5 Visual render | PDF length/layout checks | `lib/export/pdf-generator.tsx` | 🟡 Export only; no automated layout QA (Task 106) |
| 3.6 Tracked changes | Accept new only; rewrites auto-keep; Edit/Match UI | `TailorDiff`, `JobResumeEditor`, `change-decisions` | ✓ Built — see TAILOR-EDIT.md |
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
| `lib/ai/` | Prompts, gap analysis, tailor pipeline, BYOK runtime, usage metering |
| `lib/auth/` | Auth messages, profile sync after OAuth |
| `lib/tailor/` | Durable runs, change decisions (accept/decline/edit), ATS gap hints |
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

Migrations in `docs/supabase/migrations/` (001 → 022):

| Table | Role |
|-------|------|
| `profiles` | User + `profile_data` JSONB; `resume_theme` (009); first/last name from signup trigger (007) |
| `resumes` | Uploads + `structured_data` |
| `jobs` | JD storage + `application_status` / `tailoring_status` (mirrored from applications) |
| `applications` | 1:1 tracker row per job (010) |
| `application_events` | Status/timeline events (010) |
| `tailored_resumes` | Output + `changes` + `change_decisions` + `theme_override` |
| `tailor_runs` | Durable AI tailor session (max 2 Claude calls; one active per job) |
| `resume_enhancements` | Legacy Q&A storage |
| `notifications` | In-app alerts |
| `apply_runs` | Hosted auto-apply queue (021) |
| `ai_usage_events` | Per-request token/cost log (022) |
| `user_ai_secrets` | Encrypted Anthropic BYOK (022; service_role only) |

**Remote (Supabase project `wsbbgznobxhjefaqbniv`):** Core schema + RLS applied. Migrations 006–022 applied via MCP (022 = BYOK + usage).

Spec target still pending: normalized `experiences`/`projects`/`skills`, Gmail columns on `profiles`.

---

## Verification

- **Tests:** 96 passing (`npm run test`)
- **Typecheck:** `npx tsc --noEmit`
- **Auth setup:** [AUTH.md](./AUTH.md)
