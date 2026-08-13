# Remaining work — ordered roadmap

**Updated:** 2026-08-13  
**Prod:** https://hireiq.kingsharif.com

This is the single checklist for what shipped recently, what’s next, and what still needs a human.

---

## Shipped this stretch (2026-08-13)

| Area | What |
|------|------|
| **Job URL fetch** | Tiered pipeline (ATS → JSON-LD → OG → hydration → HTML → Playwright). Live suite: Apple, GH, Lever, Ashby, Workday, Stripe, **Amazon**, **Microsoft**, LinkedIn block, Indeed warn. |
| **Extension agentic apply v1** | Continue/signup flows, OTP from Gmail or masked inbound, portal creds saved on application. |
| **Portal login UI** | Job detail **Job facts** rail + **Activity** tab show email / password / note when saved. |
| **Gmail sync** | History API incremental sync when `history_id` exists; falls back to 14-day list scan. |
| **Export QA** | `runResumeLayoutCheck` blocks PDF/DOCX export on critical layout issues (Task 106 partial). |
| **Resume Builder** | Library page UX pass — master profile hero, clearer stats and links (Task 146 partial). |

Open PR: **merged** — PR #2 → `main` (2026-08-13)

---

## Do next (in order)

### 1. Merge + migrate (human + agent)

- [x] Merge PR #2 to `main` (merged 2026-08-13)
- [x] Apply migration **019** — applied 2026-08-13 (`applications.ats_account_password`)

### 2. Production smoke

- [x] Portal login UI on tracker detail (seeded creds on Forward Deployed Engineer / harperinsure) — email, masked password, show/reveal, copy, note; also on Activity tab
- [ ] Extension connect on prod → save job with portal creds (end-to-end from extension, not seed)
- [ ] Paste Amazon + Microsoft `?pid=` URLs on prod job fetch
- [ ] Gmail: Connect Gmail on Settings → Sync now → confirm `mode: history` on second sync (`google_connections` still 0)
- [ ] Masked inbound: create application email → send test mail → All outreach (`inbound_email_events` still 0)

### 3. Human-only blockers

| Task | Action |
|------|--------|
| **143 — Google login** | Supabase → Auth → Google provider + Cloud OAuth client ([AUTH.md](./AUTH.md) §3) |
| **114 — Gmail prod** | Google Cloud verification / test users for `gmail.readonly` |
| **Resend webhook** | Confirm prod webhook + redeploy after secret change ([EMAIL.md](./EMAIL.md)) |

### 4. Engineering backlog (priority)

| ID | Task | Scope |
|----|------|-------|
| 114 | Gmail sync polish | Done: History API. Next: surface sync mode in UI, handle expired history gracefully in Settings |
| 117 | Extension polish | Board adapters, broader autofill, agentic apply on more ATS walls |
| 106 | Visual render QA | Expand layout-check (page overflow, font size); show warnings in Documents export UI |
| 146 | Resume Builder consolidation | Full single-page master editor — grill IA first ([RESUME-BUILDER.md](./RESUME-BUILDER.md)) |
| 115 | Forward-to-save email | Inbound webhook for forwarded postings |
| 140 | Mask reply-relay v2 | User ↔ HireIQ ↔ employer reply path |

### 5. Nice-to-have / v2

- Fit score on application cards
- Contacts + checklist on job detail
- OCR for scanned PDFs
- People / Companies tracker tabs
- Chrome Web Store publish ([CHROME-STORE.md](./CHROME-STORE.md))

---

## Test commands

```bash
npm run test
npx tsc --noEmit
JOB_FETCH_LIVE=1 JOB_FETCH_PLAYWRIGHT=0 npx vitest run lib/jobs/__tests__/job-fetch-live.test.ts
JOB_FETCH_LIVE=1 JOB_FETCH_PLAYWRIGHT=1 npx vitest run lib/jobs/__tests__/job-fetch-live.test.ts  # includes Microsoft legacy
npm run extension:build
```

---

## Design principles (keep using)

- **Simple but great** — one primary action per view, theme tokens, light + dark
- **Verification ladder** — code review → MCP/DB confirm → UI test when user-facing
- **Document as you ship** — STATUS, CHANGELOG, TASKS, this file
