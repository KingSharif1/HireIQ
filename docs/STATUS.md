# HireIQ Status

**As of:** 2026-06-29  
**Branch:** `main` — application code only; all planning in `docs/`

## System snapshot

| Area | State |
|------|-------|
| Auth | Email + Google via Supabase ✓ |
| Resume upload (PDF/DOCX) | ✓ |
| Resume parse (Claude) | ✓ — needs tiered skills + low-confidence flags |
| Profile workspace | ✓ — JSONB `profile_data`, provenance, pending suggestions |
| Job URL fetch | Partial — Greenhouse, Lever, Ashby |
| Job analyze | ✓ |
| ATS score | ✓ — algorithmic |
| Gap Q&A | ✓ — 3-tier gap analysis + max 3 targeted questions |
| Tailor + diff | ✓ generate — diff is view-only |
| Accept/decline changes | ✓ — Changes tab, export gated on review |
| Cover letter | ✓ built — deprioritized per new spec |
| Application tracker | Partial — status on `jobs`, no events/Gmail |
| GitHub integration | ✗ |
| Gmail integration | ✗ Phase 2 |

## Phase 1 MVP progress (spec order)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Resume upload + parse | 🟡 80% | Add tiered skills, parse confidence flags, OCR fallback |
| 2 | GitHub connect | 🔴 0% | OAuth + repo sync + resume cross-ref |
| 3 | Job URL ingestion | 🟡 50% | Add Workday API, LinkedIn paste prompt, Playwright fallback |
| 4 | Gap analysis | 🟡 85% | 3-tier JSON + UI; refine prompts with real usage |
| 5 | Tailored resume + tracked changes | 🟡 85% | Accept/decline/edit UI done; feedback loop for future runs pending |
| 6 | ATS + visual check | 🟡 55% | PDF layout QA pass (length, orphans, placeholders) |
| 7 | Application log | 🟡 45% | Migrate toward `applications` schema; Kanban optional |

Legend: ✓ done · 🟡 in progress · 🔴 not started

## What changed vs old vision

The previous spec ([legacy/HIREIQ_SPEC-v0.md](./legacy/HIREIQ_SPEC-v0.md)) framed HireIQ as a broad "Job Search OS" (outreach, interview prep, discovery). **v1.0 spec narrows to tailor + track applications.** Existing cover-letter and notification code stays but is not Phase 1 priority.

## Workspace hygiene (2026-06-29)

- Moved `prototype/`, `scripts/`, `supabase/`, and `.md` specs → `docs/`
- Root `README.md` is a thin entry point
- Agent session docs: `ARCHITECTURE.md`, `STATUS.md`, `TASKS.md`, `DECISIONS.md`, `CHANGELOG.md`

## Blockers

None for continuing Phase 1 item #1 polish. GitHub OAuth needs Supabase provider config + GitHub app credentials.

## Next recommended task

See [TASKS.md](./TASKS.md) — Task 101 (align gap analysis output to spec §3.1) or Task 102 (tracked-changes accept/decline UI).
