# HireIQ

**AI resume tailoring + application tracking so job-search paperwork actually gets finished.**

Live: [hireiq.kingsharif.com](https://hireiq.kingsharif.com)

---

## Case study

| | |
|---|---|
| **Problem** | Job seekers waste hours rewriting resumes per posting and lose track of where they applied. |
| **Built** | Next.js / TypeScript app with Claude-powered tailoring, ATS-oriented scoring, application tracker (table + board), GitHub evidence enrichment, and document export. |
| **Result** | Live product used in a real job-search workflow: tailor → track → apply. |
| **Stack** | Next.js, TypeScript, Supabase, Claude, Tailwind |

**Two pillars:** tailor a resume to a job posting · track every application in one place.

---

## Quick start

```bash
npm install
npm run dev
```

Requires `.env.local` with Supabase + Anthropic keys — see [docs/README.md](docs/README.md).

---

## Documentation

All planning, specs, migrations, and dev scripts live in **[docs/](docs/)**:

| Doc | Purpose |
|-----|---------|
| [docs/SPEC.md](docs/SPEC.md) | Product & engineering spec v1.0 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Code map + spec alignment |
| [docs/STATUS.md](docs/STATUS.md) | What's built vs Phase 1 MVP |
| [docs/TASKS.md](docs/TASKS.md) | Agent task queue |
| [docs/TAILOR-EDIT.md](docs/TAILOR-EDIT.md) | Job tailor + Documents Edit / Match |
| [docs/AUTH.md](docs/AUTH.md) | Supabase auth + proxy setup |
| [docs/supabase/migrations/](docs/supabase/migrations/) | Database migrations |
| [docs/PROFILE_PROJECTS.md](docs/PROFILE_PROJECTS.md) | Recruiter-ready project blurbs for profile / GitHub enrich |

**Runtime layout:** `app/`, `components/`, `lib/`, `proxy.ts`, `store/`, `types/`  
**Framework:** Next.js 16
