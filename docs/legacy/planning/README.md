# HireIQ — Internal Planning Docs

> **Local only.** This folder lives in `_docs/` and is git-ignored. It is the working
> brain for HireIQ's design, decisions, and build progress.

## Start here

1. **[`STATUS.md`](./STATUS.md)** — where we are right now
2. **[`14-sprout-ui-gap.md`](./14-sprout-ui-gap.md)** — Sprout layout: what matches vs what's left
3. **[`08-v1-product-spec.md`](./08-v1-product-spec.md)** — full v1 contract
4. **[`05-roadmap.md`](./05-roadmap.md)** — phased build checklist

## How to use this folder

- When a **decision** changes → `01-decisions.md`
- When **work lands** → `05-roadmap.md` + `06-changelog.md`
- When **scope or UI target** changes → `08-v1-product-spec.md`, `14-sprout-ui-gap.md`, `STATUS.md`
- When **research** finds something new → `12-sprout-research.md`

## Index

| Doc | What's in it |
|-----|--------------|
| [`STATUS.md`](./STATUS.md) | **Current state, progress %, flags** |
| [`14-sprout-ui-gap.md`](./14-sprout-ui-gap.md) | **Sprout UI parity map** |
| [`00-overview.md`](./00-overview.md) | Product vision, principles |
| [`01-decisions.md`](./01-decisions.md) | Decision log Q1–Q34 |
| [`02-data-model.md`](./02-data-model.md) | Schema current + planned |
| [`03-tailoring-engine.md`](./03-tailoring-engine.md) | Two-pass critique + scored loop |
| [`04-ui-theme.md`](./04-ui-theme.md) | Dual theme tokens |
| [`05-roadmap.md`](./05-roadmap.md) | Build phases + checkboxes |
| [`06-changelog.md`](./06-changelog.md) | What actually shipped |
| [`07-v2-backlog.md`](./07-v2-backlog.md) | Job search, auto-apply |
| [`08-v1-product-spec.md`](./08-v1-product-spec.md) | Full v1 definition |
| [`09-user-flows.md`](./09-user-flows.md) | End-to-end flows |
| [`10-screens-and-ia.md`](./10-screens-and-ia.md) | Screens, routes, components |
| [`11-email-tracking.md`](./11-email-tracking.md) | Masked inbox |
| [`12-sprout-research.md`](./12-sprout-research.md) | Sprout mechanics research |
| [`13-phase-verification.md`](./13-phase-verification.md) | Phase gates |

## Status at a glance

- **Phases 0–3:** ✅ complete
- **Phase 4:** 🟡 code complete — run migration `004_notifications.sql`
- **Phase 5:** 🟡 Applications shell + nav; job detail + docs panel next
- **Final polish:** ⬜ not started

## Database migrations (apply in Supabase SQL editor)

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Base tables |
| `supabase/migrations/002_profile_data.sql` | `profiles.profile_data` |
| `supabase/migrations/004_notifications.sql` | Notifications table (Phase 4) — **applied** |
| `supabase/migrations/005_job_status_and_versions.sql` | Job status + tailored versions (Phase 5) — **applied** |

_Last updated: 2026-06-14_
