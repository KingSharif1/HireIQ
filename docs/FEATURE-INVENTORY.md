# HireIQ — feature inventory (what was built, where it lives, what it still needs)

**Verified:** 2026-11-11 · `main` @ `2123024` (pushed to `github.com/KingSharif1/HireIQ`) · **556 tests passed / 11 skipped / 0 failed** · `tsc` clean · `eslint` 0 errors (7 pre-existing warnings).

This is the audit trail for the "Sprout-class" work. Every row below was verified by reading the repo, not from memory. Anything still requiring deployment is marked **OPS**.

---

## 1. Tailoring — "minimal editing" (`COMPLETE`)

| Capability | Where |
| --- | --- |
| Per-item rules: `auto` / `tailored` / `verbatim`, hide, order, `aiChooses` | `lib/profile/blueprint.ts`, types in `types/index.ts` |
| Rules persisted on the profile | `lib/profile/data.ts` + `lib/profile/provenance.ts` (normalized on load/save) |
| Deterministic enforcement after generation (re-insert pinned, restore verbatim, strip hidden) | `lib/tailor/enforce.ts`, wired in `lib/ai/tailor-pipeline.ts`, called from `lib/tailor/execute-run.ts` |
| Bullet identity survives the model round-trip | `lib/resume/markdown.ts` (bullet id markers), `lib/ai/tailor-engine.ts` (preserves `bulletIds`) |
| Prompt instructs the model to preserve markers | `lib/ai/prompts.ts` |
| Blueprint editor UI (rules + hide + "AI chooses") | `components/profile/BlueprintPanel.tsx`, wired in `components/profile/ProfileWorkspace.tsx` (Blueprint tab) |
| "Save as rule" from the review diff | `components/tailor/TailorDiff.tsx` → `onSaveRule` in `components/jobs/detail/AiTailorFlow.tsx` + `components/jobs/JobHub.tsx` → `app/api/profile/blueprint-rule/route.ts` |
| Diff → rule mapping (decline codes → verbatim/hidden/tailored) | `lib/tailor/rule-from-diff.ts` |
| Tests | `lib/tailor/__tests__/{enforce,rule-from-diff}.test.ts` |

## 2. Credits / monthly budget (`COMPLETE`, needs migration + env)

| Capability | Where |
| --- | --- |
| Per-ATS pricing (1 credit public form, 3 account portal) | `lib/apply/credit-cost.ts` + `estimateApplyComplexity` in `lib/apply/types.ts` |
| Ledger math (monthly grant windows, remaining, can-afford) | `lib/credits/ledger.ts` |
| Monthly mint + cron | `lib/credits/mint.ts`, `app/api/cron/credit-mint/route.ts`, `monthlyGrantFor` |
| Atomic debit (no overspend race) | `debit_credits()` RPC in `docs/supabase/migrations/028_credits.sql` + `lib/credits/service.ts` (`debitCreditsAtomic`) |
| Debit wired into apply | `lib/apply/queue.ts` (gated on `CREDITS_ENABLED=1`) |
| Balance UI | `lib/credits/format.ts`, `components/credits/CreditBalanceCard.tsx`, rendered in `app/dashboard/settings/page.tsx` |
| Tests | `lib/credits/__tests__/{ledger,mint,format}.test.ts`, `lib/apply/__tests__/credit-cost.test.ts` |
| **OPS** | Apply migration **028**; set `CREDITS_ENABLED=1`, `CRON_SECRET`; schedule the mint |

## 3. Auto-apply (`CODE COMPLETE` — existing worker, now credit-gated `OPS` deploy)

| Capability | Where |
| --- | --- |
| Queue → dispatch → claim → Playwright fill/submit → terminal + pause (`needs_user`) | `lib/apply/queue.ts`, `lib/apply/process-run.ts`, `lib/apply/server-apply.ts`, `services/apply-worker/server.ts` |
| Worker image + env contract | `services/apply-worker/Dockerfile`, `README.md`, `docs/CLOUD-RUN-APPLY.md` |
| Credit gate + atomic debit on queue | `lib/apply/queue.ts` |
| **Daily-run API** — `POST /api/agent/daily-run` (session or `api_tokens` bearer; `{dryRun, limit}`; idempotent per day; non-compete block list; credit budget) | `app/api/agent/daily-run/route.ts`, `lib/apply/daily-run.ts` (pure planner, 16 tests) |
| **OPS** | Worker is **deployed** (`163.192.106.154:8080`); set `APPLY_WORKER_URL`/`APPLY_WORKER_SECRET` in Vercel and the worker's `SUPABASE_SERVICE_ROLE_KEY` |
| **Human-in-the-loop resume** — paused (`needs_user`) runs answer "what do I do?" and can be retried/cancelled | `lib/apply/resume.ts` (pure, 10 tests), `app/api/apply/runs/[runId]/resume/route.ts` |

## 4. Email timeline (`CODE COMPLETE`, needs env / OAuth)

| Capability | Where |
| --- | --- |
| Per-application alias `hireiq.<uuid>@<domain>` (mint + reverse) | `lib/email/application-alias.ts` |
| Alias used as the apply email when `email_tracking_mode='masked'` | `lib/apply/queue.ts` (`buildIdentity` → `buildApplicationAliasOrNull`) |
| Inbound: resolve user from alias, then exact application match (fuzzy fallback) | `lib/email/process-inbound.ts` (`applicationIdFromAlias`), `lib/email/link-inbound.ts` (`resolveInboundApplication`), `lib/email/inbound-match.ts` |
| Timeline/events unchanged (existing) | `application_events`, `inbound_email_events` |
| Tests | `lib/email/__tests__/{application-alias,inbound-match-alias}.test.ts` |
| **OPS** | Set `MASKED_EMAIL_DOMAIN`; verify the Resend inbound webhook. Gmail `+alias` variant still needs `gmail.readonly` |

## 4b. Job hub — ingestion & discovery (`COMPLETE`)

| Capability | Where |
| --- | --- |
| Single posting by URL (fetch → extract → normalize → save) | `lib/jobs/` (`save-from-url.ts`, `extract-pipeline.ts`, `job-scraper.ts`, `normalize-job.ts`), `app/api/jobs/fetch-url/route.ts` |
| **Employer board discovery** — pull live postings straight from public ATS APIs (Greenhouse / Lever / Ashby), no scraping | `lib/jobs/board-discovery.ts` (pure parsers + `fetchBoardPostings`), **14 tests** |
| **Discovery endpoint** — `POST /api/jobs/discover` `{ boards, dryRun?, limitPerBoard? }`; session or api-token auth; dedupes by `apply_url` | `app/api/jobs/discover/route.ts` |
| Scout leads | `lib/scout/leads.ts`, `app/api/scout/leads/*` |

**Verified live against real boards:** Greenhouse `stripe` 779 / `canonical` 316 / `figma` 142 / `discord` 26 postings; Lever `leverdemo` 10; Ashby `ramp` 176.

## 5. LinkedIn referrals (`COMPLETE`, needs migration)

| Capability | Where |
| --- | --- |
| CSV ingestion (RFC 4180 parser + LinkedIn header mapping + dedupe) | `lib/referrals/csv.ts` |
| Stage machine (`drafting → intro_asked → referred/replied/declined/no_response`) | `lib/referrals/stages.ts` |
| Match/rank connections to a target company | `lib/referrals/match.ts` |
| Claude draft prompt + route | `lib/referrals/draft-prompt.ts`, `app/api/referrals/draft/route.ts` (`referral_draft` AI feature in `lib/ai/models.ts`) |
| Import route + UI | `app/api/referrals/import/route.ts`, `components/referrals/ConnectionImport.tsx` |
| Referrals screen + nav | `app/dashboard/referrals/page.tsx`, `components/referrals/ReferralsPage.tsx`, `components/shared/primary-nav.ts` |
| **Outreach funnel (persisted)** — log an ask, then advance `intro_asked → replied/referred/declined`; stage badges on the screen | `lib/referrals/outreach.ts` (pure, 12 tests), `app/api/referrals/outreach/route.ts`, `ReferralsPage` |
| Tests | `lib/referrals/__tests__/{referrals,match,draft-prompt}.test.ts` |
| **OPS** | Apply migration **029** |

## 6. Migrations (both **UNAPPLIED** — the main blocker)

- `docs/supabase/migrations/028_credits.sql` — `credit_grants`, `credit_usages`, unique index, `debit_credits()` RPC.
- `docs/supabase/migrations/029_linkedin_referrals.sql` — `linkedin_connections`, `referral_contacts`, `referral_outreach`.

Apply against project **`wsbbgznobxhjefaqbniv`** (HIRE/Nami Supabase account). The `sbp_` token in `~/.cursor/mcp.json` belongs to the King CMS account and **cannot** touch this project (verified: 403).

## 7. Env vars (Vercel production)

`CREDITS_ENABLED=1` · `CRON_SECRET` · `MASKED_EMAIL_DOMAIN` · `APPLY_WORKER_URL` · `APPLY_WORKER_SECRET` (plus existing Supabase/Anthropic/Resend).

## 8. Follow-ups (`COMPLETE`)

| Capability | Where |
| --- | --- |
| Follow-up cadence engine — applied-but-silent applications become due at `applied_at + 5 days` (unless `follow_up_at` is set), replies cancel it, closed stages are skipped | `lib/applications/follow-ups.ts` (pure, **14 tests**) |
| Due/upcoming feed + suggested nudge text | `GET /api/agent/follow-ups` (session or api token) |
| Snooze / mark-sent | `POST /api/agent/follow-ups` `{ applicationId, action: 'snooze'｜'done', days? }` |
| **UI**: "follow-ups due" panel on `/dashboard/tracker` — overdue list, draft preview, snooze/sent buttons | `components/tracker/FollowUpsPanel.tsx`, wired in `app/dashboard/tracker/page.tsx` |
| **UI**: "Import from company boards" card on `/dashboard/jobs` — preview then import, shows per-board counts | `components/jobs/BoardDiscoveryCard.tsx`, wired in `app/dashboard/jobs/page.tsx` |

## 9. Not built (honest)

- **Job-hub Slice 1** (`lib/job-hub/ark-import.ts`, the ARK importer) — exists only as uncommitted work on the box; not on `main`.
- **Trigger.dev durable tailor worker** — not required for any of the above; only affects long tailors hitting Vercel's 120 s cap.
- **Vercel env changes** — no Vercel MCP/token available to me.

## 10. Verification commands

```bash
npx tsc --noEmit
npx vitest run        # 642 passed / 11 skipped
npm run lint          # 0 errors
```
