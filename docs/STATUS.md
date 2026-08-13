# HireIQ Status

**As of:** 2026-08-12  
**Branch:** `main` (pushed) · **Production:** https://hireiq.kingsharif.com  
**Tests:** masked-inbound unit suite green; extension **v0.9.6** local builds  

## Session handoff (next chat)

| | |
|--|--|
| **Working on** | **Task 146** — Resume Builder UX consolidation |
| **Leave alone** | Applications / tracker (user says fine); marketing landing (just shipped) |
| **Brief** | [RESUME-BUILDER.md](./RESUME-BUILDER.md) — routes, pain, pasteable opener |
| **System one-liner** | HireIQ: tailor resumes + track apps (Next/Supabase) · Builder split across Profile + library + job Teal tabs · next = one coherent Builder page |

## System snapshot

| Area | State |
|------|-------|
| Auth | 🟡 Email ✓ · Google UI ready but **provider not enabled** in Supabase (Task 143) — see AUTH.md §3 |
| Deploy | ✓ Vercel · `hireiq.kingsharif.com` · `3c1d4f4` landing finale + dashboard teal + ext popup pushed |
| Legal / branding | 🟡 Landing + `/privacy` + `/terms` live · Search Console + re-verify branding + submit sensitive-scope verification — see `docs/GOOGLE-VERIFICATION.md` |
| Resume upload (PDF/DOCX) | ✓ |
| Resume parse (Claude) | 🟡 — needs tiered skills + low-confidence flags + OCR |
| Profile / Resume Builder | 🟡 **Task 146** — works but fragmented (Builder library + Profile sections + upload + job Teal). See [RESUME-BUILDER.md](./RESUME-BUILDER.md) |
| Job URL fetch | 🟡 — GH/Lever/Ashby/Workday ✓; LinkedIn → paste; aggregator warnings |
| Job analyze | ✓ |
| ATS score | ✓ — algorithmic |
| Gap analysis | ✓ — still available via APIs; stepper retired from nav |
| Tailor stepper | ⛔ Redirected — Job Matcher + tracker replace primary flow |
| Application tracker | ✓ — Teal list/board; All outreach (134); masked inbound code + DB (139) |
| Masked apply email (Resend) | ✓ Infra live — `mail.kingsharif.com` receiving; webhook URL prod; needs smoke + `RESEND_FORWARD_FROM` optional |
| Chrome extension | 🟡 **v0.9.6** · docs in EXTENSION.md + CHROME-STORE.md · Store draft OK; Publish gated |
| GitHub integration | ✓ Task 105 |
| Gmail sync | 🟡 **Task 114** — Settings modes + Google signup scopes; needs smoke after reconnect |
| Settings | ✓ `/dashboard/settings` — tracking modes, GitHub, password, delete |
| Mask reply-relay | 🔭 **v2 — Task 140** (deepen 139: reply path, prefs UX) |

## Phase 1 MVP progress (spec order)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Resume upload + parse | 🟡 80% | Tiered skills, parse confidence flags, OCR fallback |
| 2 | GitHub connect | ✓ ~85% | OAuth link + repo sync; enable provider + migration 008 |
| 3 | Job URL ingestion | 🟡 80% | Workday + LinkedIn handling; extension save enriches ATS via scraper (135) |
| 4 | Gap analysis | ✓ ~90% | 3-tier JSON + UI |
| 5 | Tailored resume + tracked changes | ✓ ~90% | Accept/decline/edit done |
| 6 | ATS + visual check | 🟡 55% | PDF layout QA pass (Task 106) |
| 7 | Application log | ✓ ~90% | Schema + Kanban; masked inbound shipped; Gmail sync next (114) |

Legend: ✓ done · 🟡 in progress · 🔴 not started · 🔭 planned

## Session snapshot (2026-08-11 → 12) — Resend + deploy

**Done this stretch:**
1. Chose **masked inbound (Resend)** over Gmail for apply-address path (Task 139)  
2. DNS: `mail.kingsharif.com` on Vercel → Resend receiving **verified**; smoke mail lands in Resend Receiving  
3. Migration **015** applied via Supabase MCP (`masked_email`, `inbound_email_events`)  
4. App: Profile Application email UI, webhook `/api/webhooks/resend/inbound`, outreach wiring  
5. Deployed HireIQ to Vercel + `hireiq.kingsharif.com`; env secrets cleaned (no TEST_USER / OIDC on Vercel)  
6. Product lock with extension agent: **MVP tracking = Gmail sync (114)**; **v2 = full mask reply-relay (140)** — see DECISIONS  

**Ops still on human:**
- Confirm Resend webhook → `https://hireiq.kingsharif.com/api/webhooks/resend/inbound` + secret on Vercel (redeploy after secret)  
- Supabase Auth redirects include localhost **and** prod  
- End-to-end smoke: create masked address on prod → email it → see HireIQ log  

## Blockers

| Blocker | Owner | Notes |
|---------|-------|-------|
| **Enable Google Auth provider** (Task 143) | User | Supabase → Providers → Google + Cloud OAuth client; blocks Continue with Google on site + extension |
| Google `gmail.readonly` for Task 114 | User / eng | Restricted scope; CASA later at scale — start with test users |
| Resend webhook smoke | User | Secret set; redeploy + send test to masked address |
| Extension panel IA | Eng | Autofill+progress + Questions (DECISIONS 2026-08-12) |

Migrations 001–015 documented; 006–015 applied remotely via MCP.

## Next recommended tasks

1. **Task 146** — Resume Builder one-page UX ([RESUME-BUILDER.md](./RESUME-BUILDER.md)) — **start here next chat**  
2. **Task 143** — Enable Google in Supabase (AUTH.md §3); smoke login + extension Connect  
3. **Chrome Store draft** — icons + screenshots when ready; see [CHROME-STORE.md](./CHROME-STORE.md) (don’t Publish until prod Connect smoke)  
4. **Smoke Task 139 on prod** — create address → inbound → All outreach  
5. **Task 114** — Gmail read-only sync (MVP email tracking)  

Docs: [RESUME-BUILDER.md](./RESUME-BUILDER.md) · [EMAIL.md](./EMAIL.md) · [DECISIONS.md](./DECISIONS.md) · [AUTH.md](./AUTH.md) · [EXTENSION.md](./EXTENSION.md) · [CHROME-STORE.md](./CHROME-STORE.md) · [GOOGLE-VERIFICATION.md](./GOOGLE-VERIFICATION.md)
