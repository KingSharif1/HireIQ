# Auto-apply architecture (extension + hosted)

**Updated:** 2026-08-13  
**Status:** Spec / infra plan — extension path partially shipped; hosted worker not built yet.  
**Pricing:** [PRICING.md](./PRICING.md) (docs only)

HireIQ will support **both**:

1. **Extension apply** — robot runs in the user’s Chrome (cheap).
2. **Server auto-apply** — robot runs on HireIQ infra (KVM and/or Cloud Run), like Sprout’s cloud agents (metered).

---

## Why both

| Path | Best for | Cost to us |
|------|----------|------------|
| **Extension** | You / power users watching the form; CAPTCHA easy to solve yourself | ~$0 per apply |
| **Server** | Apply while away; queue many jobs; customers who want “swipe and done” | Browser minutes on our host |

Sprout mostly sells (2). We keep (1) forever and add (2) when ready to charge for it.

---

## Shared apply engine

Both paths should call the **same logic** where possible:

```
Job + tailored PDF + profile + tracking mode
    → board detect (GH / Lever / Ashby / Workday / …)
    → fill fields / answer questions
    → signup + OTP (masked or Gmail)
    → attach resume
    → submit (or pause on CAPTCHA / LinkedIn)
    → write Applied + portal creds + events
```

| Layer | Extension | Server worker |
|-------|-----------|---------------|
| Browser | User’s Chrome | Playwright Chromium in container/VM |
| Trigger | Panel / **Apply with HireIQ** handoff | `POST /api/apply/jobs/[id]/queue` |
| OTP | Poll HireIQ APIs from content script | Worker polls same APIs |
| CAPTCHA | User solves in visible tab | Pause job → notify user (v1); solvers later optional |
| LinkedIn / Indeed | No auto-submit (lock) | Same lock |

---

## Background: hosted worker

```
Website "Auto-apply (server)"
    → enqueue apply_jobs row (queued)
    → worker pulls job
    → launch Chromium (Playwright)
    → run shared agent steps
    → status: applying → applied | failed | needs_user (CAPTCHA)
    → notify + Activity events
```

Suggested tables (later migration):

- `apply_runs` — id, user_id, job_id, mode (`extension` | `server`), status, portal complexity (1|3), error, started_at, finished_at
- Reuse `applications.ats_account_*`, `application_events`

---

## Infra choice: KVM 2 vs Cloud Run

### Cloud Run (Playwright container)

- **Pros:** Scale to zero → cheap when idle; pay per apply-minute; no babysitting a VM; easy from GCP.
- **Cons:** Cold start (Chromium image is heavy); max request timeout limits long Workday flows; need enough memory (**≥2 vCPU / 2–4 GiB** typical for Playwright).
- **Best when:** Burst / low volume (early customers, few applies/day).

### KVM VPS (e.g. “KVM 2” from a host)

- **Pros:** Flat monthly fee; always warm; no timeout wall; full control (proxies, display, debugging); often cheaper once apply volume is steady.
- **Cons:** You pay while idle; you patch Chrome/OS; one box can only run N parallel browsers (RAM).
- **Best when:** You (or a few users) run applies often; you want a stable long-running worker.

### Recommendation for HireIQ now

1. **Ship extension path first** (Task 147) — $0 infra.
2. **Prototype server path on a small KVM** (your “KVM 2”) with one Playwright worker + a simple queue — easiest to debug CAPTCHA/OTP.
3. **Add Cloud Run later** for burst / multi-tenant scale-to-zero if KVM saturates or idle cost bothers you.
4. Don’t start with both; pick **KVM for v0 worker**, keep Cloud Run as the scale option in docs.

Rough intuition (not a quote): sporadic applies → Cloud Run wins on idle; daily heavy use → KVM flat rate wins. Browser automation is RAM-heavy either way.

---

## Website UX (target)

On job detail, two actions (clearly labeled):

1. **Apply with extension** — opens ATS + focuses HireIQ panel (free / autofill policy).
2. **Auto-apply on server** — queues hosted run (shows unit cost 1 or 3 before confirm).

Both require a tailored resume (or offer to tailor first — uses tailor pricing).

---

## Safety locks (both paths)

- Opt-in per job  
- Sensitive fields confirm  
- No LinkedIn/Indeed auto-submit  
- Server path: never silent money drain — show cost before queue  
- `billing_exempt` for your account while building  

---

## Task map

| ID | Work |
|----|------|
| **147** | Website ↔ extension handoff (“Apply with HireIQ”) |
| **148** | Hosted apply worker (KVM first) + `apply_runs` + queue API |
| Pricing | [PRICING.md](./PRICING.md) — Stripe later |
