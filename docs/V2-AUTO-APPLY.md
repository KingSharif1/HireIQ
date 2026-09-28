# HireIQ v2 — Auto-apply + Extension (agent brief)

**Status:** design decided, not started. v1 (prep pipeline) ships first.
**Owner's words:** the whole point is "get me an interview." v2 = Sprout/Tinder-for-jobs style: swipe through matched jobs, HireIQ applies for you, tracks everything.

## Scope split (decided 2026-09-26)

- **v1 = prep pipeline:** sign in → paste job → extract → gap questions → tailor resume + cover letter → review → export → track. (This is what's being hardened now.)
- **v2 = auto-apply + Chrome extension.** Nothing in v2 starts until v1's tailor flow is solid in production.

## Product design (decided)

**Human-in-the-loop agent.** The apply agent works the application and **pauses with questions** when it needs a human — CAPTCHA, login wall, ambiguous application questions — instead of dying to a manual link. The user answers in HireIQ (or the extension), the run resumes. This is the core UX contract; never ship a version that silently stalls or silently submits.

**Two apply surfaces** (already in AUTO-APPLY.md, unchanged):
1. **Hosted auto-apply** — queue from the HireIQ website; browser runs on infra.
2. **Extension assist** — user is already on the employer apply page: autofill, agentic Continue, OTP, Submit in their Chrome (extension v0.9.9 today).

**The bad-WiFi contract** (from real testing 2026-09-26): auto-apply runs in the background so connectivity edge cases can't silently break the experience. The page got stuck while the run was technically still working, with no way to know. v2 rule: every run writes progress rows (same `process_log` pattern the tailor worker uses); the UI polls them; a run never looks dead while it's alive, and never looks alive while it's dead.

## Infrastructure: staged decision (decided 2026-09-26/27)

**Stage 1 — now: Trigger.dev for durable orchestration.** Already implemented for the tailor worker (`trigger/tailor-run.ts`, docs in TRIGGER.md). Auto-apply workers follow the same pattern: a `trigger/apply-run.ts` task, small payload (`{ applyRunId }`), progress rows on the run table, 3-attempt retries for infra failures, idempotency keys at trigger sites.

**Stage 2 — when bot detection justifies it: Browserbase for the browser.** Recommendation from the 2026-09-26 infrastructure comparison (full analysis in the "Auto-Apply Infrastructure Comparison" artifact):
- Browserbase = hosted headless browsers built to not get flagged as bots. This is the piece that actually fights bot detection — Trigger.dev alone doesn't solve that.
- Rough cost at the time: ~$20–30/mo at a few hundred applications. **Re-verify pricing before committing.**
- The Trigger.dev task drives a Browserbase session via CDP; Playwright code stays largely the same.

**Alternatives on the table:**
- **Cloud Run** (the v1 plan): ~$1.40/mo at 200 applications but heavier ops — Docker images, browser crashes, version pinning, hand-built retries/human-in-the-loop. Remains the fallback if Trigger.dev becomes a constraint.
- **Self-hosting** (owner's open question): whether self-hosting behaves the same as Browserbase, and what he'd actually pay if he doesn't self-host. **Not answered yet** — this is his decision to make with real numbers.

**Do NOT migrate anything yet.** Trigger.dev handles orchestration today; the browser still needs a home when v2 starts. The decision to add Browserbase is a "when applications start getting blocked" call, not a day-one call.

## Email tracking (decided 2026-09-26, not implemented)

Research correction: Sprout does **not** use one masked forwarding address per user — it uses the user's real Gmail with a **unique plus-tagged alias per application**. Adopt that:
- Mint a unique alias per application (`user+hireiq-<jobid>@gmail.com` style), not one address per user with fuzzy company-name matching.
- Keep the masked HireIQ forwarding address as the **privacy option** for users who don't want their real email exposed.
- Task 114 (Gmail tracking) still needs the `gmail.readonly` verification gate — human-side, owner is doing it.

## What v2 reuses from v1 (already built)

- `trigger/` task pattern + `kickTailorWorker()` enqueue-with-fallback shape → model `trigger/apply-run.ts` on it.
- `process_log` progress rows + stale-sweeper semantics → same for apply runs.
- `ai_usage_events` + `usageMetadata` attribution → per-application cost metering (price plans above measured unit cost; Sprout's model is credits per application).
- Honesty gate (Task 167): CTAs must never promise what isn't wired up. The "never applies for you" landing-copy contradiction is still only partially resolved — v2 must close it with final messaging the owner approves.
- Extension v0.9.9 (autofill drafts on the fast tier) — the assist surface v2 builds on.

## Open questions (owner's, unanswered)

1. Self-hosting parity: does self-hosted browser infra behave the same as Browserbase for bot detection?
2. Real pricing: what does he actually pay if he doesn't self-host?
3. Final messaging: landing copy vs auto-apply reality — his call.

## Suggested build order for the v2 agent

1. `trigger/apply-run.ts` skeleton (queue → progress rows → terminal states), mirroring `tailor-run.ts`.
2. Human-in-the-loop pause/resume protocol (what the agent asks, where the user answers, how the run resumes).
3. Extension v2: from autofill drafts to agentic Continue/Submit on the page.
4. Hosted browser: start with the existing Cloud Run worker; add Browserbase when blocks appear.
5. Email: per-application alias minting + masked-address privacy option.
6. Pricing: measure tokens + browser-minutes per application, then set credit pricing above unit cost.

Related docs: AUTO-APPLY.md (v1 architecture), TRIGGER.md (durable workers), CLOUD-RUN-APPLY.md (fallback worker), EXTENSION.md, EMAIL.md, PRICING.md.
