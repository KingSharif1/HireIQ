# HireIQ Status

**As of:** 2026-08-10  
**Branch:** `main` — application code only; all planning in `docs/`  
**Tests:** description + extension unit suites green; extension **v0.8.0** built

## System snapshot

| Area | State |
|------|-------|
| Auth | ✓ Email + Google via Supabase — `proxy.ts`, forgot/reset password, profile names (007) |
| Resume upload (PDF/DOCX) | ✓ |
| Resume parse (Claude) | 🟡 — needs tiered skills + low-confidence flags + OCR |
| Profile / Resume Builder | ✓ — Profile master (131/133); job editor full-bleed + zoom/pan (132); Builder library |
| Job URL fetch | 🟡 — GH/Lever/Ashby/Workday ✓; LinkedIn → paste; aggregator warnings |
| Job analyze | ✓ |
| ATS score | ✓ — algorithmic |
| Gap analysis | ✓ — still available via APIs; stepper retired from nav |
| Tailor stepper | ⛔ Redirected — Job Matcher + tracker replace primary flow |
| Application tracker | ✓ — Teal list/board; full-page detail; All outreach (134); masked inbound code (139, needs migration + Resend env) |
| Chrome extension | 🟡 **v0.9.0** choice review + Documents merge + focus resume refresh; board adapters optional |
| GitHub integration | ✓ Task 105 |
| Gmail integration | 🔴 Phase 2 — prefer masked inbound (Task 139) over Gmail read |

## Phase 1 MVP progress (spec order)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Resume upload + parse | 🟡 80% | Tiered skills, parse confidence flags, OCR fallback |
| 2 | GitHub connect | ✓ ~85% | OAuth link + repo sync; enable provider + migration 008 |
| 3 | Job URL ingestion | 🟡 80% | Workday + LinkedIn handling; extension save enriches ATS via scraper (135); Playwright fallback pending |
| 4 | Gap analysis | ✓ ~90% | 3-tier JSON + UI; refine prompts with real usage |
| 5 | Tailored resume + tracked changes | ✓ ~90% | Accept/decline/edit done; feedback loop for future runs pending |
| 6 | ATS + visual check | 🟡 55% | PDF layout QA pass (Task 106) |
| 7 | Application log | ✓ ~85% | Schema 010 + Kanban/list (113); Gmail Phase 2 |

Legend: ✓ done · 🟡 in progress · 🔴 not started

## Completed foundation (Tasks 100–104)

| Task | What shipped |
|------|----------------|
| 100 | Repo docs layout; specs/migrations/scripts → `docs/` |
| 101 | Structured 3-tier gap analysis + `GapAnalysisSummary` UI |
| 102 | Tracked changes accept/decline/edit; export gating; migration 006 |
| 103 | Workday fetch; LinkedIn blocked → paste; aggregator warnings |
| 104 | Auth hardening: `proxy.ts`, reset password, profile trigger 007, `AUTH.md` |

**Latest:** Tasks 135–137 verified — save-first panel (v0.8), clean JD At-a-glance (no Greenhouse chrome blob), resume pick + job-scoped Q&A; see `docs/EXTENSION.md`.

## What changed vs old vision

The previous spec ([legacy/HIREIQ_SPEC-v0.md](./legacy/HIREIQ_SPEC-v0.md)) framed HireIQ as a broad "Job Search OS" (outreach, interview prep, discovery). **SPEC v1.0 narrows to tailor + track applications.** Existing cover-letter and notification code stays but is not Phase 1 priority.

## Workspace hygiene

- Runtime code at repo root: `app/`, `components/`, `lib/`, `proxy.ts`, `store/`, `types/`
- Planning & migrations: `docs/` (see [README.md](./README.md))
- Agent session docs: `ARCHITECTURE.md`, `STATUS.md`, `TASKS.md`, `DECISIONS.md`, `CHANGELOG.md`, `AUTH.md`

## Blockers

| Blocker | Owner | Notes |
|---------|-------|-------|
| Google OAuth provider | User | Enable in Supabase Dashboard + Google Cloud Console; redirect `http://localhost:3000/auth/callback` |
| GitHub OAuth app | User | Enable provider + OAuth app per [GITHUB.md](./GITHUB.md); run migration 008 |
| Chrome extension | User | Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` then smoke-test save (see [EXTENSION.md](./EXTENSION.md)) |

Email/password auth works. Migrations 001–015 documented; 006–015 applied remotely via MCP (015 = masked inbound email).

## Next recommended tasks

**IA reset locked 2026-08-04** — see [DESIGN-IA-RESET.md](./DESIGN-IA-RESET.md).

1. Set `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` and point Resend webhook at `/api/webhooks/resend/inbound` (see [EMAIL.md](./EMAIL.md))
2. **Task 117** — Extension autofill + review-queue auto-apply (masked email autofill later)
3. Remaining Phase 2 backlog (Gmail optional; OCR, etc.)

**Done:** Task 116 — Chrome extension save-to-tracker. Task 129 — Resume Builder library. Task 128 — Sprout Profile. Task 127 — Nav shell.
