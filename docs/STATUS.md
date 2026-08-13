# HireIQ Status

**As of:** 2026-08-13  
**Branch:** `main` · **Production:** https://hireiq.kingsharif.com  
**Tests:** 217 unit · 11 live URL · extension **v0.9.9** · PR #3 merged + deployed

## Session handoff

| | |
|--|--|
| **Working on** | PR #3 **merged + deployed** — smoke save-by-email + extension masked autofill |
| **Blocked** | Task 143 Google provider · Gmail OAuth consent · Chrome extension needs user’s browser |
| **Next** | Create save address on Settings · reload extension v0.9.9 · enable Google login |
| **Roadmap** | [REMAINING-WORK.md](./REMAINING-WORK.md) |

## System snapshot

| Area | State |
|------|-------|
| Auth | 🟡 Email ✓ · Google UI ready but **provider not enabled** in Supabase (Task 143) — see AUTH.md §3 |
| Deploy | ✓ Vercel · `hireiq.kingsharif.com` · `3c1d4f4` landing finale + dashboard teal + ext popup pushed |
| Legal / branding | 🟡 Landing + `/privacy` + `/terms` live · Search Console + re-verify branding + submit sensitive-scope verification — see `docs/GOOGLE-VERIFICATION.md` |
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
| Forward-to-save (Task 115) | ✓ Address + webhook parse → tracker; needs deploy + one forwarded posting smoke |
| Chrome extension | 🟡 **v0.9.9** · GH/Lever/Ashby/Workday adapters · agentic apply v1 · masked email now overlays autofill profile · EXTENSION.md |
| GitHub integration | ✓ Task 105 |
| Gmail sync | 🟡 **Task 114** | History API incremental; prod OAuth + smoke |
| Settings | ✓ `/dashboard/settings` — tracking modes, GitHub, password, delete |
| Mask reply-relay | 🔭 **v2 — Task 140** (deepen 139: reply path, prefs UX) |

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

Migrations 001–018 applied remotely; **019 applied** 2026-08-13 — see [supabase/MIGRATIONS.md](./supabase/MIGRATIONS.md).

## Next recommended tasks

1. Merge PR #3, then Connect Gmail on prod Settings → Sync now  
2. **Task 143** — Enable Google in Supabase ([AUTH.md](./AUTH.md) §3)  
3. After deploy: create **Save jobs by email** address → forward a Greenhouse posting  
4. **Chrome Store draft** — [CHROME-STORE.md](./CHROME-STORE.md)  

Docs: [REMAINING-WORK.md](./REMAINING-WORK.md) · [EMAIL.md](./EMAIL.md) · [DECISIONS.md](./DECISIONS.md) · [AUTH.md](./AUTH.md) · [EXTENSION.md](./EXTENSION.md)
