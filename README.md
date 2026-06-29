# HireIQ

AI-powered resume tailoring and job application tracking.

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
| [docs/supabase/migrations/](docs/supabase/migrations/) | Database migrations |

**`main` branch = application code only** (`app/`, `components/`, `lib/`, etc.). Everything else is in `docs/`.
