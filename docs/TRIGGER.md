# Trigger.dev — durable background jobs

## Why

"Tailor with AI" is a 2–4 minute Claude rewrite. The durable home is the
`tailor-run` task on Trigger.dev. The Next.js routes can also run the same
phases in-process (`after()`), but only inside the route `maxDuration` of
**300 seconds** (`POST /api/tailor/runs` and `POST /api/tailor/runs/[id]/continue`).

A development key (`tr_dev_…`) only works when `npm run trigger:dev` is listening.
On Vercel that worker does not exist. Enqueueing with a dev key leaves the run
in Queued until the stale check (330s) marks it failed. `tailorDispatchPlan()`
therefore **ignores `tr_dev_` keys when `VERCEL` or `NODE_ENV=production`** and
runs in-process instead. A production or staging key (`tr_prod_…`, `tr_stg_…`)
always enqueues. If `tailorRun.trigger()` throws, the route falls back to
in-process. If that cannot be scheduled either, `recordTailorKickFailure` writes
`status: failed` and a user-facing error so the row never stays Queued.

Trigger.dev runs tasks on its own infra with **no timeouts** (runs can last up to
14 days), automatic retries, and full observability. It is the same stack Sprout
uses for its background jobs (see the 2026-09-26 Sprout research notes). The plan:
move the tailor generate phase (and later, auto-apply workers) into Trigger.dev
tasks, triggered from the Next.js API routes.

## Pricing & limits (checked 2026-09-26 — re-verify at trigger.dev/pricing)

| Plan | Price | Included credit | Concurrent runs |
|------|-------|-----------------|-----------------|
| Free | $0 | $5/mo | 20 |
| Hobby | $10/mo | $10/mo | 50 |
| Pro | $50/mo | $50/mo | 200 |

Usage beyond the credit is billed on compute time (~$0.12/hour on a small machine)
plus ~$0.25 per 10k run invocations. Queue caps: 10k (Free) / 250k (Hobby) queued
runs per queue; 1-day log retention on Free.

### What a tailor run costs

A tailor run is ~2–4 minutes of actual compute on a small machine: roughly
**under $0.01 per run** in Trigger.dev charges. The free tier's $5 credit therefore
covers **hundreds of tailor runs per month** — plenty for development plus friends
testing. Do NOT pay for Hobby until real user volume arrives.

The cost to actually watch is the **Anthropic API bill**, not Trigger.dev — LLM
tokens will dwarf Trigger's compute 10–100x per run. Measure input/output tokens
per full tailor run and price user plans above that unit cost. (Sprout's model is
credits per application — a per-run cap maps directly to measurable cost.)

When you upgrade to a paid plan, overage usage bills automatically: set a billing
alert in the Trigger.dev dashboard.

## Repo wiring (done 2026-09-26, extended 2026-09-28, uncommitted)

- `@trigger.dev/sdk` (4.6.4) in `dependencies`, `trigger.dev` CLI (4.6.4) in
  `devDependencies` — versions pinned together per Trigger.dev's recommendation.
- `trigger.config.ts` at root: `dirs: ["trigger"]`, node runtime, project-level
  `maxDuration: 600`, retries (3 attempts, backoff), project ref
  `proj_pxpzhbzddvrliudcyiys`.
- `trigger/healthcheck.ts`: smoke-test task for the dev → deploy → dashboard
  pipeline. Kept (cheap, useful for future pipeline verification).
- `trigger/tailor-run.ts`: the durable tailor worker (see below).
- `lib/tailor/trigger-client.ts`: `kickTailorWorker()` — enqueue when the key can
  reach a worker; otherwise `after()` inside the 300s route budget.
- `lib/tailor/kick-failure.ts`: marks the run failed when nothing can be scheduled.
- `npm run trigger:dev` / `npm run trigger:deploy` scripts (fixed 2026-09-28:
  v4 CLI binary is `trigger`, not `trigger.dev`).
- `.trigger/` added to `.gitignore`; `TRIGGER_SECRET_KEY` added to `.env.example`.

## Setup checklist (done 2026-09-26 except where noted)

1. ✅ Project ref `proj_pxpzhbzddvrliudcyiys` pasted into `trigger.config.ts`.
2. ✅ Development API key created; set as `TRIGGER_SECRET_KEY` in local
   `.env.local` (gitignored) and added to the Vercel `hireiq` project for
   Production, Preview, and Development (via dashboard — a redeploy is needed
   before the deployed app picks it up).
3. ⬜ Run `npm run trigger:dev`, trigger the `healthcheck` task from a test route,
   and confirm the run in the dashboard.
4. ⬜ Before deploying tasks that call Anthropic/Supabase: add `ANTHROPIC_API_KEY`
   and the Supabase keys as environment variables **in the Trigger.dev
   dashboard** — tasks execute on Trigger.dev infra, Vercel env vars do not
   carry over.
5. ⬜ Later, when moving to production: create a Production API key in the
   Trigger.dev dashboard and swap it into Vercel's Production environment
   (the current key is a Development key — fine for testing).

## Tailor worker (implemented 2026-09-28)

`trigger/tailor-run.ts` owns the durable phases that were dying in `after()`:

- **Payload:** `{ runId, userId, phase: 'gap' | 'generate', answers? }` — small;
  the task re-reads job + profile from Supabase. `'gap'` runs gap analysis then
  chains into generate (draft-first flow); `'generate'` is the weave/legacy path.
- **Call sites:** `POST /api/tailor/runs` and `POST /api/tailor/runs/[id]/continue`
  call `kickTailorWorker()` (`lib/tailor/trigger-client.ts`).
  A production/staging key enqueues `tailor-run` with an idempotency key
  (`tailor:{runId}:{phase}:{answersHash}`) so network retries don't duplicate
  runs. A missing key, or a `tr_dev_` key on Vercel, falls back to in-process
  `after()` (300s). Localhost with a dev key still enqueues, which requires
  `npm run trigger:dev`.
- **Progress:** the phases patch `process_log` on the tailor run row as they go,
  which the existing `TailorProcessLog` UI already polls — no UI changes. Those
  patches also keep `updated_at` fresh so the stale-sweeper (3 min) doesn't mark
  a healthy long run as failed.
- **Idempotency:** re-entering is safe — `executeGapPhase` no-ops unless the run
  is still `analyzing_gaps` (`claimGapPhase` is atomic); `executeGeneratePhase`
  no-ops on failed/cancelled runs.
- **Failure:** domain failures are recorded on the run row by `failRun()` inside
  the phases and never throw. Unexpected infra throws are logged and rethrown so
  Trigger.dev retries (3 attempts, backoff); the dashboard records the terminal
  failure after attempts are exhausted.

### Instrumentation (what to watch, where)

| Signal | Where |
|---|---|
| Duration, machine, invocation count, attempts/retries | Trigger.dev dashboard → run detail (native) |
| Tokens + est. cost per tailor run | Task's `tailor-run complete` log line (`aiRequests`, `inputTokens`, `outputTokens`, `estimatedCostUsd`) — sourced from `ai_usage_events` via `usageMetadata: { tailor_run_id }`, summed by `sumUsageForTailorRun()` |
| Terminal failures | Dashboard run status + `tailor-run phase threw` log; run row carries `failRun()` reasons for domain failures |
| Phase progress | `tailor_runs.process_log` (same rows the UI polls) |

Every AI call in the tailor path now accepts `usageMetadata`
(`GenerateArgs` → `recordAiUsage.metadata`), so per-run token attribution works
for any future task too — pass `{ tailor_run_id: runId }`.

### Env vars the tasks need

Tasks run on Trigger.dev infra — Vercel env vars do **not** carry over. Set these
in the Trigger.dev dashboard (Project → Environment Variables):

- `ANTHROPIC_API_KEY` — the HireIQ key (server-side; never the user's BYOK key —
  BYOK runs resolve the user's key at call time via `resolveAiRuntime`)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — task reads/writes run rows
- `TRIGGER_SECRET_KEY` — not needed *by* tasks, but required in the **Vercel**
  project so API routes can enqueue runs (already set for Production, Preview,
  Development — redeploy needed before the live app picks it up)

Local `trigger:dev` reads `.env.local` for the worker process.

### Production setup (owner)

Do these in order. A dev key on Vercel is not enough — the app will tailor
in-process (300s) and log a warning until a production key is deployed.

1. Trigger.dev dashboard → API Keys → create a **Production** secret key (`tr_prod_…`).
2. Vercel → Project `hireiq` → Settings → Environment Variables:
   set `TRIGGER_SECRET_KEY` to that production key for **Production**
   (Preview can keep a staging key). Redeploy so the new value is live.
3. Trigger.dev dashboard → Environment Variables for the **prod** environment
   (tasks do not see Vercel env):
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AI_KEY_ENCRYPTION_SECRET` if you set one on Vercel (BYOK + portal passwords)
4. From a machine logged into the CLI: `npm run trigger:deploy`
   (deploys `trigger/tailor-run.ts` and `trigger/healthcheck.ts` for project
   `proj_pxpzhbzddvrliudcyiys`).
5. Dashboard → confirm a `healthcheck` or a real tailor run leaves Queued and
   finishes. The run row should reach `needs_review`, not `failed` after 330s.

Local: put a Development key (`tr_dev_…`) in `.env.local` and run
`npm run trigger:dev` in another terminal. Without that process, local kicks
still enqueue and nothing listens — unset the key to use the in-process path.

### Setup checklist

1. ✅ Project ref `proj_pxpzhbzddvrliudcyiys` in `trigger.config.ts`.
2. ✅ Development API key can live in local `.env.local`.
3. ✅ `trigger/tailor-run.ts` implemented; routes call it via `kickTailorWorker()`.
4. ✅ npm scripts: `trigger:dev` → `trigger dev`, `trigger:deploy` → `trigger deploy`.
5. ⬜ **Owner:** production key on Vercel, task env vars in the Trigger.dev
   dashboard, `npm run trigger:deploy`, then redeploy Vercel.
6. ⬜ Re-run a production tailor (new-grad Greenhouse URL) after that deploy.

The existing Cloud Run worker pattern (`services/apply-worker/`, docs in
`CLOUD-RUN-APPLY.md`) remains the fallback if Trigger.dev ever becomes a
constraint; both read the same run tables.
