# 12 — Sprout Research Notes

> Public sources + product mapping for HireIQ. **Not** verified internal implementation.
> **Updated:** 2026-08-13 (refreshed from Sprout help + marketing)

## Sources

- [AI Apply feature](https://www.usesprout.com/features/ai-apply)
- [Pricing](https://www.usesprout.com/pricing)
- [How Credits Work](https://help.usesprout.com/en/articles/11639803-how-credits-work)
- [Why credits run out fast](https://help.usesprout.com/en/articles/11511308-why-did-i-run-out-of-application-credits-even-though-i-only-applied-to-a-few-jobs)
- [Credit balance looks wrong](https://help.usesprout.com/en/articles/16258294-my-credit-balance-looks-wrong)
- [Whisperpost / apply email](https://help.usesprout.com/en/articles/11511462-why-is-the-email-on-my-job-applications-not-my-personal-email)
- [Reply to interviewer](https://help.usesprout.com/en/articles/11511475-how-do-i-reply-to-an-interviewer-if-my-application-was-sent-using-a-whisperpost-io-email)
- [View login credentials](https://help.usesprout.com/en/articles/12053211-how-do-i-view-login-credentials)
- [Sprout homepage](https://www.usesprout.com/)

---

## What “AI Apply” actually is (public)

End-to-end loop Sprout sells:

1. **Discover** jobs in-app (swipe / job board).
2. **Swipe right / tap Apply** → starts the pipeline (credit deducted here).
3. **Generate** tailored resume + cover letter from profile.
4. **Optional human review** — “Require Approval” setting; otherwise can go faster.
5. **Agent fills** the employer portal (field detect + map from profile/resume).
6. **Agent submits** (or fails → History → open listing manually).
7. **Track** in Job History; email updates via dedicated apply address.

Marketing claims form detection, smart field mapping, instant submission, tracker sync ([AI Apply](https://www.usesprout.com/features/ai-apply)).

---

## Credit system (why they charge)

| Cost | When |
|------|------|
| **1 credit** | Standard applications |
| **3 credits** | Complex portals (esp. Workday): account create, CAPTCHA, multi-step, redirects, slow sites |

- Cost shown with ⚡ on the job card **before** swipe.
- Deducted on **swipe**, not on successful submit — generating docs starts then.
- Skip (swipe left) = free.
- System failure → automatic credit refund.
- Credits **do not roll over**; reset each billing period (weekly plans every 7 days).

Public pricing (Aug 2026 marketing): ~**$29.99/wk · 50 apps**, **$59.99/mo · 200 apps**, quarterly tiers ([Pricing](https://www.usesprout.com/pricing)). Credits are how they meter **server-side automation cost** (browsers, CAPTCHA solvers, retries), not a technical requirement of autofill itself.

---

## Apply identity + credentials

Two apply identities ([help](https://help.usesprout.com/en/articles/11511462-why-is-the-email-on-my-job-applications-not-my-personal-email)):

| Mode | Address |
|------|---------|
| Gmail connected | Gmail **alias** (`you+…@gmail.com` style) |
| No Gmail | Unique `@whisperpost.io` |

Both: employer mail → personal inbox + per-job Inbox in app; OTP / portal setup handled during apply; replies work like normal email ([reply help](https://help.usesprout.com/en/articles/11511475-how-do-i-reply-to-an-interviewer-if-my-application-was-sent-using-a-whisperpost-io-email)).

When a portal needs an account, Sprout saves credentials under **Application Credentials** ([help](https://help.usesprout.com/en/articles/12053211-how-do-i-view-login-credentials)).

---

## HireIQ mapping (2026-08-13)

| Sprout piece | HireIQ today | Gap |
|--------------|--------------|-----|
| Swipe discovery | Bring-your-own URL / tracker | No swipe feed (by design) |
| Tailored resume/CL | Tailor + Documents | Cover letter weaker; one-click chain missing |
| Autofill forms | Extension v0.9.9 + board adapters | Good on GH/Lever/Ashby/Workday |
| Multi-step + submit | Agentic apply v1 (Continue, signup, OTP) | Not unattended “one tap done” yet |
| Masked / alias email | `masked_email` + Gmail mode | Reply-via-HireIQ shipped (Task 140 slice) |
| Portal credentials | `ats_account_*` on timeline | Matches Sprout pattern |
| Credits / subscription | **None** | Keep none for personal product |
| Cloud browser farm | N/A — extension runs **in your Chrome** | CAPTCHA = you solve; no credit metering needed |

### Can we do “see job → tailor → AI applies” without spending like Sprout?

**Yes — for a personal HireIQ product.** Credits are Sprout’s **billing meter** for cloud agents. HireIQ can run the hard part in the **user’s browser** (extension already started):

```
Save / open job → Tailor resume (Claude — usage cost only)
  → Open apply URL with extension
  → Autofill + agentic Continue / signup / OTP / attach PDF
  → User-watched Submit (always on LinkedIn/Indeed; default elsewhere until trusted)
  → Mark Applied + portal creds on timeline
```

**What you still “pay”:** Anthropic tokens for tailor (and any future Q&A). **What you don’t need:** Sprout-style weekly credit packs.

**Hard limits (same physics Sprout hits):** CAPTCHA, weird Workday flows, LinkedIn/Indeed ToS (we stay manual submit), sites that block automation. Sprout charges **3 credits** for that complexity; we pause and ask the human.

---

## Product lock proposal (Task 147)

1. **No credits** on HireIQ for auto-apply.
2. **Primary path:** Chrome extension agentic apply (local), not a HireIQ-hosted browser farm.
3. **One website CTA:** job detail **Apply with HireIQ** = ensure tailored PDF → deep-link / focus extension on apply URL → agentic run with review gates for sensitive fields.
4. **Require approval default on** for first ship (match Sprout’s safe setting).
5. Revisit cloud/unattended apply only if we later productize for many users (then credits or usage pricing make sense).

---

## Older notes (UI DOM, still useful)

See prior sections in git history for 3-pane job UI, fit score sidebar, etc. Core product implications unchanged: profile-as-master, per-job docs, masked email, questions tab.
