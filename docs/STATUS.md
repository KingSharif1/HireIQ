# HireIQ Status

**As of:** 2026-08-13  
**Branch:** `main` · **Production:** https://hireiq.kingsharif.com  
**Tests:** 226 unit · 11 live URL · extension **v0.9.9** · Task **148** merged (PR #8)

## Session handoff

| | |
|--|--|
| **Working on** | Task **147** extension assist CTA (next) |
| **Blocked** | Task 143 Google · GCP Cloud Run project not wired yet (`APPLY_WORKER_URL` unset → runs stay queued) |
| **Next** | Deploy `services/apply-worker` to Cloud Run + Vercel env · then Task **147** |
| **Roadmap** | [AUTO-APPLY.md](./AUTO-APPLY.md) · [CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md) · [PRICING.md](./PRICING.md) |

## System snapshot

| Area | State |
|------|-------|
| Auth | 🟡 Email ✓ · Google UI ready but **provider not enabled** in Supabase (Task 143) — see AUTH.md §3 |
| Deploy | ✓ Vercel · `hireiq.kingsharif.com` |
| Legal / branding | 🟡 Landing + `/privacy` + `/terms` live · Search Console + re-verify branding — see `docs/GOOGLE-VERIFICATION.md` |
| Resume upload (PDF/DOCX) | ✓ |
| Resume parse (Claude) | 🟡 — needs tiered skills + low-confidence flags + OCR |
| Profile / Resume Builder | ✓ **Task 146** — one Builder nav; Master is one scrolling page + Files tab |
| Job URL fetch | ✓ ~90% | Amazon/Microsoft + tiered pipeline; legacy MS URLs need Playwright |
| Job analyze | ✓ |
| ATS score | ✓ — algorithmic |
| Gap analysis | ✓ — still available via APIs; stepper retired from nav |
| Tailor stepper | ⛔ Redirected — Job Matcher + tracker replace primary flow |
| Application tracker | ✓ — Teal list/board; All outreach (134); masked inbound code + DB (139) |
| Masked apply email (Resend) | ✓ Infra live — `mail.kingsharif.com` receiving; webhook URL prod; needs smoke + `RESEND_FORWARD_FROM` optional |
| Forward-to-save (Task 115) | ✓ Address + webhook parse → tracker; needs one forwarded posting smoke |
| Chrome extension | 🟡 **v0.9.9** · GH/Lever/Ashby/Workday adapters · agentic apply v1 · EXTENSION.md |
| GitHub integration | ✓ Task 105 |
| Gmail sync | 🟡 **Task 114** | History API incremental; prod OAuth + smoke |
| Settings | ✓ `/dashboard/settings` — tracking modes, GitHub, password, delete |
| Mask reply-relay | ✓ **Task 140** first slice live (PR #4) — Reply via HireIQ on Email tab |
| Auto-apply (Sprout-like) | 🟡 **148** code live (queue, CTA, progress UI, worker image) · **Cloud Run deploy** still open · **147** next |

## Phase 1 MVP progress (spec order)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Resume upload + parse | 🟡 80% | Tiered skills, parse confidence flags, OCR fallback |
| 2 | GitHub connect | ✓ ~85% | OAuth link + repo sync; enable provider + migration 008 |
| 3 | Job URL ingestion | ✓ ~90% | Tiered fetch + Amazon/Microsoft live tests |
| 4 | Gap analysis | ✓ ~90% | 3-tier JSON + UI |
| 5 | Tailored resume + tracked changes | ✓ ~90% | Accept/decline/edit done |
| 6 | ATS + visual check | 🟡 85% | Documents Export check + page count + font-size heuristics; critical issues still block API export |
| 7 | Application log | ✓ ~92% | Portal login UI; Gmail history sync |

Legend: ✓ done · 🟡 in progress · 🔴 not started · 🔭 planned

## Blockers

| Blocker | Owner | Notes |
|---------|-------|-------|
| **Enable Google Auth provider** (Task 143) | User | Supabase → Providers → Google + Cloud OAuth client; blocks Continue with Google on site + extension |
| Google `gmail.readonly` for Task 114 | User / eng | Restricted scope; CASA later at scale — start with test users |
| **Cloud Run apply worker** (Task 148 ops) | User | Deploy per [CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md); set `APPLY_WORKER_URL` + `APPLY_WORKER_SECRET` on Vercel |
| Resend webhook smoke | User | Secret set; redeploy + send test to masked address |

Migrations 001–**021** applied remotely — see [supabase/MIGRATIONS.md](./supabase/MIGRATIONS.md).

## Next recommended tasks

1. **Deploy apply-worker** to Cloud Run + wire Vercel env ([CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md))
2. **Task 147** — extension assist CTA when already on ATS
3. **Task 143** — Enable Google in Supabase ([AUTH.md](./AUTH.md) §3)
4. Connect Gmail on prod Settings → Sync now
5. **Chrome Store draft** — [CHROME-STORE.md](./CHROME-STORE.md)

Docs: [REMAINING-WORK.md](./REMAINING-WORK.md) · [EMAIL.md](./EMAIL.md) · [DECISIONS.md](./DECISIONS.md) · [AUTH.md](./AUTH.md) · [EXTENSION.md](./EXTENSION.md) · [AUTO-APPLY.md](./AUTO-APPLY.md)
