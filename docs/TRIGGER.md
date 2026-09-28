# Trigger.dev — durable background jobs

## Why

"Tailor with AI" runs its generate phase inside Next.js `after()` on Vercel, where
the function (background work included) is capped at `maxDuration = 120s`. A full
Sonnet 5 rewrite (~22k input tokens, up to 8k output) routinely exceeds that, so the
platform kills the run mid-generation — no error is recorded, and the stale-sweeper
marks it failed minutes later. This is a durable-execution problem, not a prompt
problem.

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
- `lib/tailor/trigger-client.ts`: `kickTailorWorker()` — Trigger.dev enqueue with
  `after()` dev fallback.
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
  call `kickTailorWorker()` (`lib/tailor/trigger-client.ts`) instead of `after()`.
  When `TRIGGER_SECRET_KEY` is set (Vercel Production/Preview/Development) the
  task is enqueued with an idempotency key
  (`tailor:{runId}:{phase}:{answersHash}`) so network retries don't duplicate
  runs. When the key is missing (local dev without `trigger:dev`), it falls back
  to in-process `after()` with a console warning — fine on localhost, never in
  production.
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

### Setup checklist

1. ✅ Project ref `proj_pxpzhbzddvrliudcyiys` in `trigger.config.ts`.
2. ✅ Development API key in local `.env.local` and Vercel `hireiq` project
   (Production, Preview, Development).
3. ✅ `trigger/tailor-run.ts` implemented; routes call it via `kickTailorWorker()`.
4. ✅ npm scripts fixed: v4 CLI binary is `trigger`, not `trigger.dev`
   (`trigger:dev` → `trigger dev`, `trigger:deploy` → `trigger deploy`).
5. ⬜ **Human step:** `trigger login` (one-time, opens browser) on the dev machine,
   then `npm run trigger:dev`, then fire the `healthcheck` task from the
   Trigger.dev dashboard and confirm the run. The CLI could not be authenticated
   non-interactively.
6. ⬜ Add `ANTHROPIC_API_KEY` + Supabase keys as environment variables in the
   Trigger.dev dashboard before any deployed task runs.
7. ⬜ Production cutover: create a Production API key in the dashboard and swap it
   into Vercel's Production env (current key is a Development key).
8. ⬜ Re-run the Freeform production tailor test after merge + deploy (blocked on
   human merge/deploy — Vercel auto-deploys on main).

The existing Cloud Run worker pattern (`services/apply-worker/`, docs in
`CLOUD-RUN-APPLY.md`) remains the fallback if Trigger.dev ever becomes a
constraint; both read the same run tables.
