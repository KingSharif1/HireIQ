# 12 — Sprout Research Notes

> What we know from public sources + user-provided DOM snippets.
> **Not** verified internal implementation. Use as pattern reference only.
> Last updated: 2026-06-14

## Sources

- [How Credits Work](https://help.usesprout.com/en/articles/11639803-how-credits-work)
- [Why credits run out fast](https://help.usesprout.com/en/articles/11511308-why-did-i-run-out-of-application-credits-even-though-i-only-applied-to-a-few-jobs)
- [Whisperpost email](https://help.usesprout.com/en/articles/11511462-why-is-the-email-on-my-job-applications-not-my-personal-email)
- [Reply via whisperpost](https://help.usesprout.com/en/articles/11511475-how-do-i-reply-to-an-interviewer-if-my-application-was-sent-using-a-whisperpost-io-email)
- [View login credentials](https://help.usesprout.com/en/articles/12053211-how-do-i-view-login-credentials)
- [AI Apply feature page](https://www.usesprout.com/features/ai-apply)
- User-pasted DOM from `app.usesprout.com` (logged-in UI snippets)

---

## Credit system (1 vs 3)

**What we thought:** credits scale with resume length or number of screening questions.

**What Sprout actually says:**

| Cost | When |
|------|------|
| **1 credit** | Standard applications (most jobs) |
| **3 credits** | Workday-hosted applications, CAPTCHA, multi-step forms |

- Cost shown on **job card before apply** (⚡ badge).
- Credits deducted when user swipes/commits to apply.
- Credits reset weekly on subscription billing cycle; don't roll over.

**HireIQ implication:** When we add billing (v2), price by **portal automation complexity**, not document length. Our v1 has no credit system.

---

## Application email (whisperpost.io)

- Each user gets a unique `@whisperpost.io` address.
- Used **on applications** instead of personal email.
- Sprout can access this inbox for verification codes during auto-apply.
- All emails **forward to user's real inbox** — user replies normally.
- Replies route back through whisperpost to employer.

**HireIQ:** Same pattern with our domain. See `11-email-tracking.md`.

---

## Application credentials

When a job portal requires account creation:
1. Sprout creates account with whisperpost email + generated password.
2. Verification emails go to whisperpost inbox → agent completes signup.
3. Credentials saved per application.
4. User views under **Applications → [job] → Application Credentials**:
   - Email address (copy)
   - Password (show/copy)
   - Security note

**They do NOT** reset passwords on existing personal-email accounts. Collision avoided because the portal account uses the masked email, not the user's Gmail.

**User DOM evidence:** Blue card showing `sharifahmed.dev.d7w@whisperpost.io` + password field.

---

## Auto-apply flow (public description)

1. User swipes right on job (or clicks Apply on web).
2. Sprout generates tailored resume + cover letter.
3. Optional review step (user setting).
4. AI agent opens employer's application page.
5. Detects fields, fills from profile, answers screening questions.
6. Submits application.
7. Logs in Job History; uses whisperpost for any verification.

Failed applications → "Failed" in history; user can complete manually. Credits may be refunded on failure (per FAQ).

**HireIQ:** v2. v1 = manual apply with masked email for tracking.

---

## Job detail UI (from user DOM)

### Layout
- **3-pane** on desktop: left nav (sections), center (documents), right sidebar (job info).
- We simplify to **2-pane**: center + right sidebar; left nav becomes tabs in center.

### Left section nav (per job)
- Application Documents
- Questions (badge count)
- LinkedIn Outreach (v2 for us)
- Company Timeline
- Inbox

### Center — Documents
- Tabs: Resume | Cover Letter
- Version label: `v1`
- Actions: Edit, Regenerate, `1/3 used`, Submit
- Resume preview (one-page emphasis)

### Right sidebar — accordions
1. **Job Fit Score** — e.g. 7.5/10 with skills breakdown
2. **Job details** — title, company, location, salary, remote, tags, View Original link
3. **Application details** — Status, Doc Gen, Review Pending, Credit Cost, Created/Updated

### Application Credentials section
- Shown when portal account created (during/after auto-apply).

### In-progress state
- "Application In Progress — being processed" empty state while agent runs.

**HireIQ mapping:** See `10-screens-and-ia.md`. We skip Submit (no auto-apply v1), Outreach, and 3-pane density.

---

## Profile UI (from user DOM)

- Sidebar groups: PROFILE, DOCUMENTS, PROFESSIONAL PROFILE
- Sections with count badges (e.g. Experience 3, Skills 8)
- Review/completeness indicator
- Single clean column forms

**HireIQ:** Already built in `ProfileWorkspace` — close structural match.

---

## What we intentionally do differently

| Sprout | HireIQ v1 |
|--------|-----------|
| 3-pane job detail | 2-pane, simpler |
| Swipe job discovery | Bring your own job |
| Auto-apply | Manual apply |
| Credit subscription | Free / no credits v1 |
| Submit button on docs | Export PDF/DOCX instead |
| LinkedIn outreach | v2 |
| One-page resume only | Seniority-based length (1–2 pg) |

## What we match

- Profile-as-master career record
- Sectioned profile with badges
- Per-job document versions + regenerate cap
- Fit score in sidebar
- Masked email for tracking
- Questions tab showing AI Q&A
- Change-aware tailoring (our diff summary)
