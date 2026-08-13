# Auto-apply architecture (extension + hosted)

**Updated:** 2026-08-13  
**Status:** Hosted path implementing (Task 148) — queue + CTA + worker package; Cloud Run deploy pending. Extension path partially shipped.  
**Pricing:** [PRICING.md](./PRICING.md) (docs only)

HireIQ supports **two ways to apply**, both on **web** (desktop/laptop browser). Mobile is not the primary surface for auto-apply v1.

1. **Auto-apply with HireIQ (server)** — primary “Sprout-like” product: queue from the HireIQ website; Playwright runs on **Cloud Run**.
2. **Extension assist** — when you’re **already on** the employer apply page: autofill / Continue / OTP / Submit in your Chrome (cheap, live).

---

## Product UX (web-first)

| Situation | What we show |
|-----------|----------------|
| On HireIQ job detail (web) | Primary CTA: **Auto-apply with HireIQ** → queues Cloud Run worker. Secondary: **Open apply page** (manual / with extension if installed). |
| Already on Greenhouse / Lever / etc. | Extension panel: Autofill, Questions, Submit, agentic Continue — no Cloud Run needed. |
| Mobile | Tracker + tailor OK; **no** hosted auto-apply promise in v1 (screens small, CAPTCHA painful). Revisit later. |

You do **not** need the extension for server auto-apply. Extension is the “I’m already on the form” accelerator.

---

## Why Cloud Run (not the $28/mo KVM as primary)

Owner already pays ~**$28/mo** for a KVM VPS. Cloud Run is better as the **apply worker** because:

| | Cloud Run | Always-on KVM |
|--|-----------|----------------|
| Idle | **~$0** (scale to zero) | $28 whether you apply or not |
| Scale | Many parallel applies when customers show up | One box = few Chromium tabs |
| Ops | Container + deploy | Patch OS/Chrome yourself |
| Fit now | Low volume + free tier headroom | Useful as **debug/staging** box if you want |

**Lock:** Hosted auto-apply runs on **Cloud Run** (Playwright + Chromium image, ≥2 vCPU / 2–4 GiB). Keep the KVM for other things or as a manual fallback — don’t burn it as the forever apply farm unless Cloud Run timeouts become a hard blocker (long Workday). Use Cloud Run **jobs** or longer request timeouts for multi-step flows.

---

## Shared apply engine

Both paths should share rules/code where possible:

```
Job + tailored PDF + profile + tracking mode
    → board detect (GH / Lever / Ashby / Workday / …)
    → fill fields / answer questions
    → signup + OTP (masked or Gmail)
    → attach resume
    → submit (or pause on CAPTCHA / LinkedIn)
    → write Applied + portal creds + events
```

| Layer | Extension | Cloud Run worker |
|-------|-----------|------------------|
| Browser | User’s Chrome | Playwright Chromium in container |
| Trigger | On ATS page panel | HireIQ web **Auto-apply with HireIQ** |
| OTP | Poll HireIQ APIs | Same APIs from worker |
| CAPTCHA | User solves live | Status `needs_user` → notify; resume after |
| LinkedIn / Indeed | No auto-submit | Same lock |

---

## Background: Cloud Run worker

```
HireIQ web "Auto-apply with HireIQ"
    → ensure tailored PDF exists (or offer tailor first — billed)
    → enqueue apply_runs (queued)
    → Cloud Run receives job (HTTP or Pub/Sub / Cloud Tasks)
    → Playwright launches Chromium
    → run shared agent steps + board adapters
    → status: applying → applied | failed | needs_user
    → notify + Activity events
```

Suggested tables:

- `apply_runs` — **shipped** (migration **021**): id, user_id, job_id, mode (`extension` | `server`), status, complexity (1|3), board, apply_url, submit, error, result, started_at, finished_at
- Reuse `applications.ats_account_*`, `application_events`

### APIs (Task 148)

| Route | Role |
|-------|------|
| `POST /api/apply/jobs/[jobId]/queue` | Auth user → insert `apply_runs` → dispatch `APPLY_WORKER_URL/run` |
| `GET /api/apply/runs/[runId]` | Poll status |
| `POST /api/apply/worker/run` | Bearer `APPLY_WORKER_SECRET` → `processApplyRun` (optional; Cloud Run prefers `services/apply-worker`) |

Env: `APPLY_WORKER_URL`, `APPLY_WORKER_SECRET`. Local: `npm run apply:worker` + optional `APPLY_WORKER_INLINE=1` on the Next app.

**Deploy guide:** [CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md)

**Default:** fill-only (`submit: false`). CAPTCHA / missing fields → `needs_user`. LinkedIn/Indeed blocked.

**Live progress:** worker writes `apply_runs.result.progress` (steps + filled fields); job detail polls and animates the panel.

---

## Will it work on *any* job application?

**No — not magically on day one.** Same reality as Sprout: common ATS boards work well; weird custom career sites fail more often.

### What works well first

- **Greenhouse, Lever, Ashby, Workday** — we already have field maps / selectors (`lib/extension/board.ts`). Server worker reuses the same adapters.
- Company pages that **iframe or redirect** into those ATS hosts.

### What fails or needs a human

- Heavy CAPTCHA / bot walls  
- LinkedIn Easy Apply / Indeed (ToS — we don’t auto-submit)  
- One-off WordPress “email us” forms, PDF-only applies, weird SPAs with no stable selectors  
- Sites that block datacenter IPs (Cloud Run egress) — may need residential proxy later (cost)  

### How it gets better over time (“learn”)

Not mystical ML on every DOM — the same **learnable rules** pattern as job URL fetch:

1. Run apply → success or structured failure (hostname, step, missing selector, screenshot/HTML snippet).
2. Log failure into `apply_runs` / advisors list.
3. Add or tighten a **board adapter** (selectors, Continue button, resume input, wait rules).
4. Next run on that host uses the new rule — extension **and** Cloud Run both improve.

Optional later: LLM “what should I click?” as a fallback when no adapter matches — slower/costlier; adapters stay the default for reliability.

So: **not every site forever**, but **coverage grows** the more real applies we run and document — especially the big ATS hosts that dominate volume.

---

## Task map

| ID | Work |
|----|------|
| **147** | Web job detail: open-with-extension assist + tailor gate |
| **148** | **Cloud Run** Playwright worker + queue + **Auto-apply with HireIQ** CTA |
| Pricing | [PRICING.md](./PRICING.md) — Stripe later |

---

## Safety locks

- Opt-in per job on web  
- Show server-apply cost before queue (when billing exists)  
- Sensitive fields confirm  
- No LinkedIn/Indeed auto-submit  
- `billing_exempt` for owner while building  
