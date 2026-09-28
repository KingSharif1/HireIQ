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

## Repo wiring (done 2026-09-26, uncommitted)

- `@trigger.dev/sdk` (4.6.4) in `dependencies`, `trigger.dev` CLI (4.6.4) in
  `devDependencies` — versions pinned together per Trigger.dev's recommendation.
- `trigger.config.ts` at root: `dirs: ["trigger"]`, node runtime, project-level
  `maxDuration: 600`, retries (3 attempts, backoff). **The `project` field is still
  `proj_YOUR_PROJECT_REF` — replace it with the real ref from the dashboard.**
- `trigger/healthcheck.ts`: placeholder smoke-test task. Use it to verify the
  pipeline (dev → deploy → dashboard run), then delete it when the real
  tailor worker lands.
- `npm run trigger:dev` / `npm run trigger:deploy` scripts.
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

## Planned tailor worker (spec to come)

`trigger/tailor-run.ts` will own the durable phases currently dying in `after()`:

- Payload: `{ tailorRunId }` (small — the task re-reads job + profile from Supabase).
- Phases: gap analysis → generate → critique/repair loop → persist draft →
  mark run `needs_review`.
- Progress: the task writes progress rows the existing `TailorProcessLog`
  already polls, so the UI needs no redesign — it just stops timing out.
- Idempotency: re-triggering the same `tailorRunId` resumes instead of
  duplicating work (check run status before starting phases).
- Failure: `failRun()` semantics move into the task's catch + `onFailure`
  lifecycle — a failed run always writes a reason, never a silent stall.

The existing Cloud Run worker pattern (`services/apply-worker/`, docs in
`CLOUD-RUN-APPLY.md`) remains the fallback if Trigger.dev ever becomes a
constraint; both read the same run tables.
