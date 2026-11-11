# HireIQ go-live checklist

Everything in this list is ops/deploy — the code is built and green (556 tests). Work top-to-bottom; most items are
independent.

## Status (2026-11-11)

| Item | State |
| --- | --- |
| Code (`main`) | ✅ `ddeeee9` pushed · 556 tests · tsc/eslint clean |
| Migrations 028/029 | ❌ **not applied** (need HireIQ Supabase access — see step 1) |
| Auto-apply worker | ✅ **deployed** — OCI `HireIQ` x86, `163.192.106.154:8080`, health verified from outside |
| Worker service-role key | ❌ **not set** in the container (so `/run` can't process yet) |
| Vercel env | ⚠️ partial — `CRON_SECRET` set (cron returns 401); `CREDITS_ENABLED` / `APPLY_WORKER_URL` / `APPLY_WORKER_SECRET` / `MASKED_EMAIL_DOMAIN` unverified |
| Gmail OAuth | ❌ not done (only needed for the Gmail `+alias` path) |
| Job-hub Slice 1 | ❌ uncommitted on the box |

Deployment details and the worker secret: `ARK/projects/hireiq/build-logs/2026-11-11-oracle-apply-worker-deploy.md`.

## 1. Apply migrations (Supabase)

```bash
# from the repo, via the Supabase CLI or the dashboard SQL editor
# docs/supabase/migrations/028_credits.sql
# docs/supabase/migrations/029_linkedin_referrals.sql
```

- `028_credits.sql` — `credit_grants` + `credit_usages` + `debit_credits()` RPC (atomic can-afford debit).
- `029_linkedin_referrals.sql` — `linkedin_connections` + `referral_contacts` + `referral_outreach`.

## 2. Set env vars (Vercel production)

| Var | Purpose | Set when |
| --- | --- | --- |
| `CREDITS_ENABLED=1` | turns on the apply-credit gate in `queueServerApply` | after 028 |
| `CRON_SECRET` | auth for `/api/cron/*` | always |
| `MASKED_EMAIL_DOMAIN` | domain for per-application `hireiq.<uuid>@…` aliases | email tracking |
| `APPLY_WORKER_URL` / `APPLY_WORKER_SECRET` | where the auto-apply worker lives | after worker deploy |
| `RESEND_API_KEY` / `RESEND_FORWARD_FROM` | masked inbox + forwarding (already used) | already |

## 3. Deploy the auto-apply worker (Oracle Cloud)

`services/apply-worker/` is a self-contained Node HTTP service (`server.ts` → `processApplyRun` → Playwright). Build the
`Dockerfile`, run it on an Oracle Cloud VM/OCI container, expose `/run` with `APPLY_WORKER_SECRET`, then set
`APPLY_WORKER_URL` + `APPLY_WORKER_SECRET` in Vercel. Healthcheck: `GET /health` → `{ ok: true }`.

## 4. Schedule the credit mint

`POST /api/cron/credit-mint` (or GET) with `Authorization: Bearer $CRON_SECRET` — idempotent, run daily. Vercel Cron or any
scheduler hitting the deployed URL.

## 5. Gmail OAuth (for the `+alias` path)

Google Data access → `gmail.readonly` scope → the existing `google_connections` flow + Task 114. Only needed if you want
the Gmail `+alias` variant; the masked `hireiq.<uuid>` path works without it once `MASKED_EMAIL_DOMAIN` is set.

## 6. Job-hub Slice 1

`lib/job-hub/ark-import.ts` (the ARK importer) is uncommitted on the box (`/workspace/repos/HireIQ`). Either push it and
`git pull` here, or re-implement it on this checkout.

## 6b. Automated verification (run this any time)

```bash
npm run verify:deploy
# or point it at a specific worker:
WORKER_BASE=http://163.192.106.154:8080 npm run verify:deploy
```

It checks, from outside, and exits non-zero on any failure:

| Check | Meaning |
| --- | --- |
| `app:reachable` | deployed site responds |
| `project:anon-key` | pulls the anon key from the live bundle and derives the Supabase project ref |
| `table:*` | base tables (`profiles`/`jobs`/`applications`) must exist; the five migration tables must too — `PGRST205` = migration not applied to *this* project |
| `cron:credit-mint` | `401` = `CRON_SECRET` configured; `{"skipped":true}` = not configured |
| `worker:health` / `worker:auth` | worker answers `/health` and rejects a bad bearer |

Implementation: `lib/deploy/verify.ts` (pure, unit-tested) + `scripts/verify-deployment.ts`.

## 7. Verify end-to-end (smoke)

1. Sign in → Upload resume → Tailor a job → decline a change → **Save as rule** → regenerate → the rule is enforced.
2. Settings shows the credit balance card (after 028 + `CREDITS_ENABLED` + one mint run).
3. Auto-apply a Greenhouse job → worker runs → application moves to `applied` / pauses on CAPTCHA.
4. Apply with masked tracking → employer replies to the `hireiq.<uuid>` alias → appears on the job's Email timeline.
5. `/dashboard/referrals` → import `Connections.csv` → enter a target company → ranked connections → draft an intro.
