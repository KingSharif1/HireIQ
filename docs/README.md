# HireIQ — Developer Guide

> Stop losing jobs you're qualified for. HireIQ asks the right questions, then rewrites your resume in the language the job is looking for.

**Product spec:** [SPEC.md](./SPEC.md)  
**Architecture map:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
**Current status:** [STATUS.md](./STATUS.md)  
**Active tasks:** [TASKS.md](./TASKS.md)  
**Auth setup:** [AUTH.md](./AUTH.md)  
**Masked email (Resend):** [EMAIL.md](./EMAIL.md)

---

## Repo layout

| Path | Purpose |
|------|---------|
| `app/`, `components/`, `lib/`, `store/`, `types/` | Application code (what ships) |
| `proxy.ts` | Next.js 16 auth proxy — session refresh + `/dashboard/*` guard |
| `docs/SPEC.md` | Product & engineering spec v1.0 |
| `docs/supabase/migrations/` | SQL migrations — run in Supabase SQL Editor |
| `docs/scripts/` | UI audit (Playwright), dev utilities |
| `docs/prototype/` | HTML design explorations (not wired to app) |
| `docs/legacy/` | Archived v0 spec + old planning — [legacy/README.md](./legacy/README.md) |

---

## Core loop (current build)

```
Sign in (email or Google)
       ↓
Upload resume  →  Paste / scrape job URL (GH, Lever, Ashby, Workday; LinkedIn → paste)
       ↓
   ATS score  →  3-tier gap summary  →  Gap Q&A (max 3 questions)
       ↓
   Tailored resume + tracked changes (accept / decline / edit on Job Hub)
       ↓
   Export PDF or DOCX (approved changes only)
```

**Phase 1 still to build:** PDF layout QA (Task 106), `applications` schema (Task 107).

---

## Tech stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router + `proxy.ts`) |
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

# GitHub repo sync (Profile → Projects) — see docs/GITHUB.md
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

Optional UI audit credentials:

```env
TEST_USER_EMAIL=...
TEST_USER_PASSWORD=...
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
6. `docs/supabase/migrations/007_auth_profile_trigger.sql`
7. `docs/supabase/migrations/008_github_integration.sql`

**Auth setup:** [AUTH.md](./AUTH.md)  
**GitHub setup:** [GITHUB.md](./GITHUB.md) — redirect URLs, Google OAuth, troubleshooting.

Create private storage buckets: `resumes`, `exports`  
RLS: `auth.uid()::text = (storage.foldername(name))[1]`

### UI audit (optional)

```bash
npm run ui:shots:headed
```

Screenshots → `.ui-audit/` (gitignored).

### Tests

```bash
npm run test        # 70 tests
npx tsc --noEmit
```

---

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/resume/parse` | Upload → extract → Claude parse |
| `POST /api/jobs/fetch-url` | Scrape GH / Lever / Ashby / Workday; LinkedIn blocked |
| `POST /api/jobs/analyze` | Structured JD extraction |
| `POST /api/tailor/score` | ATS score (no AI) |
| `POST /api/tailor/questions` | 3-tier gap analysis + max 3 questions |
| `POST /api/tailor/generate` | Tailored resume + diff |
| `PATCH /api/tailor/[id]/decisions` | Accept / decline / edit per tracked change |
| `/api/github/connect` | Start GitHub OAuth |
| `/api/github/callback` | OAuth callback + initial sync |
| `GET/POST /api/github/sync` | GitHub status + repo sync |
| `DELETE /api/github/disconnect` | Remove GitHub connection |
| `POST /api/export/pdf` · `docx` | Export approved resume to Storage |
| `POST /api/tailor/cover-letter` | Cover letter (built; not Phase 1 priority) |
| `GET /api/notifications` | In-app notifications |

---

## Agent sessions

Read in order before coding: `ARCHITECTURE.md` → `STATUS.md` → `TASKS.md` → `DECISIONS.md` → `CHANGELOG.md`

Claim one task from `TASKS.md`, stay in scope, mark DONE when finished.

**Current queue:** Task 106 (visual QA) → Task 107 (applications schema).
