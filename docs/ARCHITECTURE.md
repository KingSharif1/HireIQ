# HireIQ Architecture

**Last updated:** 2026-06-29  
**Spec:** [SPEC.md](./SPEC.md) v1.0

## Product focus (v1.0 spec)

Two pillars only:

1. **Tailor a resume** — JD + profile → tailored resume with tracked accept/decline changes
2. **Track applications** — job log, Gmail scan (Phase 2), single clean view

Cover letter, outreach, and interview prep exist in the codebase but are **out of Phase 1 scope** per the new spec.

---

## Repo layout

```
HireIQ/
├── app/              # Next.js routes (pages + API)
├── components/       # UI by feature
├── lib/              # Business logic (no React)
├── store/            # Zustand client state
├── types/            # Shared TypeScript types
├── docs/             # Everything non-runtime (this folder)
│   ├── SPEC.md
│   ├── ARCHITECTURE.md / STATUS.md / TASKS.md / DECISIONS.md / CHANGELOG.md
│   ├── prototype/    # HTML design explorations
│   ├── scripts/      # Playwright UI audit, dev utilities
│   └── supabase/     # SQL migrations (run manually in Supabase)
└── README.md         # Minimal pointer → docs/
```

**Rule:** `main` holds application code only. Planning, migrations, prototypes, and scripts live under `docs/`.

---

## Data flow (current implementation)

```
Upload PDF/DOCX
    → app/api/resume/parse
    → Claude (PROMPT 1) → resumes.structured_data JSONB
    → optional sync → profiles.profile_data (sectioned profile UI)

Paste JD or job URL
    → app/api/jobs/fetch-url (Greenhouse / Lever / Ashby / generic)
    → app/api/jobs/analyze → Claude (PROMPT 2) → jobs.extracted_data JSONB

Tailor flow (Zustand store, 5 steps)
    → app/api/tailor/score     → lib/scoring/ats-scorer (no AI)
    → app/api/tailor/questions → Claude (PROMPT 3) gap questions
    → app/api/tailor/generate  → lib/ai/tailor-pipeline → tailored_resumes
    → app/api/tailor/cover-letter (Phase 1+ extra — not in new spec MVP)
    → app/api/export/pdf|docx  → Supabase Storage

Application tracking (partial)
    → jobs table + application_status / tailoring_status columns
    → components/jobs/JobHub.tsx detail view
```

---

## Module map: spec → code

| Spec module | Target | Current location | Status |
|-------------|--------|------------------|--------|
| **1 Profile Engine** | | | |
| 1.1 Resume parse | `profiles.parsed_data` + tiered skills | `app/api/resume/parse`, `lib/ai/prompts.ts`, `resumes.structured_data` | Partial — no OCR, skills not tiered core/familiar/tools |
| 1.2 GitHub OAuth | `profiles.github_data` | — | **Not built** |
| 1.3 Profile schema | `experiences`, `projects`, `skills` tables | `profiles.profile_data` JSONB + `resumes` | JSONB-first; normalized tables deferred (see DECISIONS) |
| **2 Job Ingestion** | | | |
| 2.1 Fetch JD | Workday, GH, Lever, Ashby, LinkedIn paste | `lib/jobs/job-scraper.ts` | Partial — GH/Lever/Ashby only; no Workday, LinkedIn detect, Playwright fallback |
| 2.2 JD extraction | `key_phrases`, `ats_keywords`, `posting_age_days` | `lib/jobs/normalize-job.ts`, `JobExtractedData` type | Partial — missing key phrase frequency, posting age |
| **3 Tailoring** | | | |
| 3.1 Gap analysis | 3-tier direct/adjacent/gap JSON | `app/api/tailor/questions` | Partial — questions only, no structured gap output |
| 3.2 User questions | Max 2–3, evidence-based | `components/tailor/QuestionFlow.tsx` | Built — verify prompt matches spec rules |
| 3.3 Resume build | Role-based section order, bullet rules | `lib/ai/tailor-pipeline.ts`, `tailor-engine.ts` | Partial — critique loop exists; section order not role-aware |
| 3.4 ATS check | 70%+ keywords, density, format | `lib/scoring/ats-scorer.ts` | Built — weights differ from spec checklist |
| 3.5 Visual render | PDF length/layout checks | `lib/export/pdf-generator.tsx` | Partial — export only, no automated layout QA |
| 3.6 Tracked changes | Accept / decline / edit per change | `components/tailor/TailorDiff.tsx` | Partial — read-only diff; no accept/decline UI |
| **4 Application tracker** | | | |
| 4.1 Schema | `applications` + `application_events` | `jobs` table repurposed | Partial — no events table, no Gmail fields |
| 4.2 Display | Cards, detail, Kanban | `app/dashboard/jobs/*`, `JobHub.tsx` | Partial — detail exists; no Kanban, no timeline |
| 4.3 Gmail | Daily scan, status inference | — | **Phase 2 — not built** |

---

## Tech stack (actual vs spec)

| Layer | Spec | Repo |
|-------|------|------|
| Framework | Next.js 15 | Next.js 16 |
| DB / Auth | Supabase | Supabase ✓ |
| AI | Claude Sonnet + Haiku | Anthropic via Vercel AI SDK ✓ |
| PDF export | Puppeteer/Playwright | `@react-pdf/renderer` (Vercel-friendly) |
| Job scrape | Playwright fallback | Cheerio + public APIs only |
| Background jobs | Edge Functions + pg_cron | Not set up |

---

## Key directories (runtime code)

| Path | Responsibility |
|------|----------------|
| `lib/ai/` | Prompts, tailor pipeline, critique/retry loop |
| `lib/profile/` | Profile JSONB ↔ resume sync, provenance, bullets |
| `lib/jobs/` | URL scrape, job normalization, status labels |
| `lib/scoring/` | Deterministic ATS scorer |
| `lib/export/` | PDF + DOCX generation |
| `lib/supabase/` | Browser/server clients, query helpers |
| `components/tailor/` | Stepper, Q&A, diff, match score |
| `components/profile/` | Full profile workspace (Sprout-style) |
| `components/jobs/` | Job hub / application detail |

---

## Database (current)

Migrations in `docs/supabase/migrations/`:

| Table | Role |
|-------|------|
| `profiles` | User + `profile_data` JSONB |
| `resumes` | Uploads + `structured_data` |
| `jobs` | JD storage + `application_status` / `tailoring_status` |
| `tailored_resumes` | Output + `changes` JSONB + versions |
| `resume_enhancements` | Legacy Q&A storage |
| `notifications` | In-app alerts |

Spec target adds: normalized `experiences`, `projects`, `skills`, `applications`, `application_events`, GitHub/Gmail columns on `profiles`.
