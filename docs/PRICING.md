# HireIQ pricing (draft — docs only)

**Status:** Product lock / planning — **not implemented** in code or Stripe.  
**Updated:** 2026-08-13  
**Related:** [DECISIONS.md](./DECISIONS.md) · [AUTO-APPLY.md](./AUTO-APPLY.md) · Sprout research

This is how we intend to charge **if/when we have customers**. Your own account can stay unlimited while building.

---

## Principles

1. **Charge where HireIQ incurs real cost** (Claude tokens, hosted browser minutes).
2. **Don’t charge for near-free local work** (Chrome extension autofill on the user’s machine).
3. **Two apply paths:** Extension (cheap) vs **Server auto-apply** (metered).
4. Keep numbers simple; revisit after first paying users.

---

## Metered products

| Product | What the user gets | Our cost driver | Draft price idea |
|---------|-------------------|-----------------|------------------|
| **Job resume tailor** | Tailored resume (and optional cover) for one tracked job | Anthropic tokens | **2 included for the price of 1**, then **$X per extra tailor** (or credit pack) |
| **Server auto-apply** | HireIQ cloud agent opens the ATS, fills, submits (unattended / queue) | Browser VM/Cloud Run minutes + retries | **Charged per apply** (1 vs 3 by portal complexity, Sprout-style) |
| **Extension autofill** | Fill forms in the user’s Chrome | ~$0 infra | **Free** (preferred). Fallback: **10 free / period**, then small fee per N fills |
| **Masked email / tracker** | Apply address, inbound, reply | Resend | Free with account (or soft cap later) |

### Tailor — “2 for the price of 1”

Interpretation locked for docs:

- Buying a **tailor pack** or first paid unit unlocks **2 job-specific resumes**.
- After those 2, each additional tailor is billed separately (or burns a tailor credit).
- Exact dollar amount TBD when Stripe lands; the **ratio** (2-for-1 then à la carte) is the lock.

### Server auto-apply — charge always (when using our servers)

- Uses **our** Cloud Run browsers → must be metered for customers.
- **Infra reality (personal / low volume):** request-based Cloud Run + free tier ≈ **$0** for typical hunt volume; ~**$0.005/run** gross at 90s · 2 vCPU / 2 GiB before free tier. See [CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md) cost table. The **$28 VPS** is flat monthly whether idle or busy — not the primary apply farm.
- Suggested complexity ladder (same idea as Sprout, not their prices):
  - **1 unit** — Greenhouse / Lever / Ashby-style single form
  - **3 units** — Workday, account create + OTP, CAPTCHA pause/retry, multi-step
- Refund unit if **our** system fails (not if the user abandons or the employer site rejects the candidate).

### Extension autofill — free by default

- Runs on the user’s CPU; no Claude required for field fill.
- Prefer **unlimited free** for connected extension users.
- Optional safety valve if abused: **10 free autofills / rolling week**, then $Y per 10 — only if we see abuse or need a free-tier gate.

---

## What we do **not** charge for (v1 SaaS)

- Saving jobs / tracker
- Status updates / All outreach UI
- Portal login storage
- Connecting the extension
- Creating masked / save-by-email addresses (Resend volume stays low at start)

---

## Free vs paid (sketch)

| Tier | Idea |
|------|------|
| **Builder (you / early)** | Unlimited — flag `billing_exempt` on profile |
| **Free** | Tracker + extension autofill; **0–1** tailor trial; no server auto-apply |
| **Paid** | Tailor packs (2-for-1 structure) + server auto-apply units |

---

## Implementation notes

- Tables: `ai_usage_events` (022, live), `user_ai_secrets` (encrypted BYOK). Stripe `credit_balances` still later.
- Deduct **tailor** conceptually on successful `/api/tailor/generate` (usage row per Claude call today; product count from `tailored_resumes`)
- **Server apply** logs an infra estimate on queue (`~ $0.005 × complexity`)
- Settings → **AI**: HireIQ key vs user Anthropic key; strong/fast model pickers; usage table

---

## Open questions

1. Dollar amounts for tailor and apply units?
2. Weekly pack vs monthly subscription vs pure pay-as-you-go?
3. Deduct server-apply on start vs success?
4. Cover letter bundled with tailor or separate meter?
