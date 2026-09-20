# Job Hunt Tracker — system of record

Sharif Ahmed uses HireIQ `/dashboard/tracker` as the long-term ledger for the job search.

## Weekday cadence
- **Mon–Fri:** target **2–3** applications per day
- **Sat/Sun:** optional bonus applies or resume prep only

## Status model
`queued` → `applied` → `recruiter_screen` → `interview` → `offer` | `rejected` | `ghosted`  
Also: `skipped` (store reason)

## Gmail monitoring
After each apply, watch for:
1. Auto-confirmation (batch of 2026-09-19 already received)
2. Recruiter / hiring-manager replies (real signal — use inbound email events)
3. Assessment / interview scheduling links

Update `last_email_check` and a short email note on each application.

## Seed data (2026-09-19)
See [`../data/job-hunt-seed.json`](../data/job-hunt-seed.json).

| Company | Role | Status | Email |
|---------|------|--------|-------|
| Self Financial | Associate Software Engineer (UI) | applied | Greenhouse confirmation |
| Ontic | Associate Software Engineer Full Stack | applied | Ashby confirmation |
| Vestwell | Associate, Software Engineer | applied | confirmation |
| Torc Robotics | Systems Engineer I Test Automation | applied | confirmation |
| L3Harris | Associate Software Engineer | applied | confirmation |
| Raytheon | Software Engineer I EO/IR | skipped | active clearance required |

## Import
Until a one-click import lands, create matching `jobs` + `applications` rows in Supabase (or via the tracker UI) from the seed JSON. Keep any agent-side CSV as a backup mirror only — HireIQ is source of truth after import.

Related epic: issue #30.
