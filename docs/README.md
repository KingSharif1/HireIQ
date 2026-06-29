# HireIQ — Developer Guide

> Stop losing jobs you're qualified for. HireIQ asks the right questions, then rewrites your resume in the language the job is looking for.

**Product spec:** [SPEC.md](./SPEC.md)  
**Architecture map:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
**Current status:** [STATUS.md](./STATUS.md)  
**Active tasks:** [TASKS.md](./TASKS.md)

---

## Repo layout

| Path | Purpose |
|------|---------|
| `app/`, `components/`, `lib/`, `store/`, `types/` | Application code (what ships) |
| `docs/SPEC.md` | Product & engineering spec v1.0 |
| `docs/supabase/migrations/` | SQL migrations — run in Supabase SQL Editor |
| `docs/scripts/` | UI audit (Playwright), dev utilities |
| `docs/prototype/` | HTML design explorations (not wired to app) |

---

## Core loop (current build)

```
Upload resume  →  Paste / scrape job description
       ↓
   ATS score
       ↓
   Gap Q&A  →  Tailored resume + diff
       ↓
   Export PDF or DOCX
```

Phase 1 spec adds: GitHub profile enrichment, accept/decline per change, fuller application tracker.

---

## Tech stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude via Vercel AI SDK |
| PDF | `@react-pdf/renderer` |
| DOCX | `docx` |
| State | Zustand (tailor flow) |

---

## Getting started

### Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com) project
- [Anthropic](https://console.anthropic.com) API key

### Environment

Create `.env.local` at project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Install and run

```bash
npm install
npm run dev
```

### Database setup

Run migrations **in order** in Supabase SQL Editor:

1. `docs/supabase/migrations/001_initial_schema.sql`
2. `docs/supabase/migrations/002_profile_data.sql`
3. `docs/supabase/migrations/004_notifications.sql`
4. `docs/supabase/migrations/005_job_status_and_versions.sql`
5. `docs/supabase/migrations/006_change_decisions.sql`

Create private storage buckets: `resumes`, `exports`  
RLS: `auth.uid()::text = (storage.foldername(name))[1]`

### UI audit (optional)

```bash
npm run ui:shots:headed
```

Screenshots → `.ui-audit/` (gitignored). Credentials from `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` in `.env.local`.

### Tests

```bash
npm run test
npx tsc --noEmit
```

---

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/resume/parse` | Upload → extract → Claude parse |
| `POST /api/jobs/fetch-url` | Scrape Greenhouse / Lever / Ashby |
| `POST /api/jobs/analyze` | Structured JD extraction |
| `POST /api/tailor/score` | ATS score (no AI) |
| `POST /api/tailor/questions` | Gap questions |
| `POST /api/tailor/generate` | Tailored resume + diff |
| `POST /api/export/pdf` · `docx` | Export to Storage |

---

## Agent sessions

Read in order before coding: `ARCHITECTURE.md` → `STATUS.md` → `TASKS.md` → `DECISIONS.md` → `CHANGELOG.md`

Claim one task from `TASKS.md`, stay in scope, mark DONE when finished.
