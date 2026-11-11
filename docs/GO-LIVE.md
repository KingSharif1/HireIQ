# HireIQ go-live checklist

Everything in this list is ops/deploy — the code is built and green (556 tests). Work top-to-bottom; most items are
independent.

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

## 7. Verify end-to-end (smoke)

1. Sign in → Upload resume → Tailor a job → decline a change → **Save as rule** → regenerate → the rule is enforced.
2. Settings shows the credit balance card (after 028 + `CREDITS_ENABLED` + one mint run).
3. Auto-apply a Greenhouse job → worker runs → application moves to `applied` / pauses on CAPTCHA.
4. Apply with masked tracking → employer replies to the `hireiq.<uuid>` alias → appears on the job's Email timeline.
5. `/dashboard/referrals` → import `Connections.csv` → enter a target company → ranked connections → draft an intro.
