# HireIQ Status

**As of:** 2026-09-18
**Branch:** `main` · **Production:** https://hireiq.kingsharif.com
**Tests:** 391+ passing · extension **v0.9.9** · Tasks **162, 164–171** DONE

## Session handoff

| | |
|--|--|
| **Working on** | Idle — **168–171** shipped |
| **Parallel** | Clear |
| **Blocked** | Human: Google Data access for `gmail.readonly`; Cloud Run worker env for live Auto-apply |
| **Next** | Live smoke: review overlay + GitHub enrich + Emerson tailor; Wire Cloud Run · Task 147 |
| **Roadmap** | [TAILOR-EDIT.md](./TAILOR-EDIT.md) · [TAILOR-QUALITY.md](./TAILOR-QUALITY.md) · [GITHUB.md](./GITHUB.md) · [AUTO-APPLY.md](./AUTO-APPLY.md) |

**Job detail (Applications):** Overview CTAs clearer; Job description rejects glued ATS chrome as bullets; Q&A tab = Tailor gaps + Form answers (not on Activity); Email shows Synced / HireIQ address / Forwarded; Auto-apply shows **setup needed** when `APPLY_WORKER_URL`+secret unset. **Defaults:** strong = Sonnet 5, fast = Haiku 4.5. Master Profile hub remains locked ([PROFILE-MASTER.md](./PROFILE-MASTER.md)).
## System snapshot

| Area | State |
|------|-------|
| Auth | 🟡 Email ✓ · Google UI ready but **provider not enabled** in Supabase (Task 143) — see AUTH.md §3 |
| Deploy | ✓ Vercel · `hireiq.kingsharif.com` |
| Legal / branding | 🟡 Landing + `/privacy` + `/terms` live · Search Console + re-verify branding — see `docs/GOOGLE-VERIFICATION.md` |
| Resume upload (PDF/DOCX) | ✓ |
| Resume parse (Claude) | 🟡 — needs tiered skills + low-confidence flags + OCR |
| Profile / master hub | ✓ **163–165** — [PROFILE-MASTER.md](./PROFILE-MASTER.md) |
| Master export | ✓ Card → dialog + live zoom/pan preview · does not mutate master |
| Job Documents Edit | ✓ **Task 152** — Edit / Design / Match — see [TAILOR-EDIT.md](./TAILOR-EDIT.md) |
| Job detail UX | ✓ **Task 167** — description hygiene, Q&A IA, email provenance, honest Auto-apply |
| Job URL fetch | ✓ ~90% | Amazon/Microsoft + tiered pipeline; legacy MS URLs need Playwright |
| Job analyze | ✓ |
| ATS score | ✓ — algorithmic |
| Gap analysis | ✓ Task **162** draft-first — optional chips after draft |
| Tailor | ✓ **162** draft-first · **168** Claude-quality · **170–171** review UI (split + what/why + score delta) · Sonnet 5 |
| GitHub integration | ✓ Sync + **164** intel + **169** linked enrich via suggestions + deny-forever suppress |
| Tailor stepper | ⛔ Redirected — Job Matcher + tracker replace primary flow |
| Application tracker | ✓ — Teal list/board; facts in header; Auto-apply CTA; timeline-first Activity |
| Masked apply email (Resend) | ✓ Infra live — needs smoke + optional `RESEND_FORWARD_FROM` |
| Forward-to-save (Task 115) | ✓ Address + webhook; needs one forwarded posting smoke |
| Chrome extension | 🟡 **v0.9.9** · GH/Lever/Ashby/Workday · EXTENSION.md |
| Gmail sync | 🟡 **Task 114** | History API; prod OAuth + smoke |
| Settings | ✓ `/dashboard/settings` — AI, tracking, GitHub, password, delete |
| Mask reply-relay | ✓ **Task 140** — Reply via HireIQ on Email tab |
| Auto-apply (Sprout-like) | ✓ **157** CTA · **148** Cloud Run code · **167** honesty gate · deploy still ops |

## Phase 1 MVP progress (spec order)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Resume upload + parse | 🟡 80% | Tiered skills, parse confidence flags, OCR fallback |
| 2 | GitHub connect | ✓ ~90% | OAuth + sync + deep intel; live smoke after reconnect |
| 3 | Job URL ingestion | ✓ ~90% | Tiered fetch + Amazon/Microsoft live tests |
| 4 | Gap analysis | ✓ ~95% | 3-tier + ATS fallback questions |
| 5 | Tailored resume + tracked changes | ✓ ~95% | Accept-new-only; Edit/Match workspace |
| 6 | ATS + visual check | 🟡 85% | Documents Export check + page count + font-size heuristics |
| 7 | Application log | ✓ ~92% | Portal login UI; Gmail history sync |

Legend: ✓ done · 🟡 in progress · 🔴 not started · 🔭 planned

## Blockers

| Blocker | Owner | Notes |
|---------|-------|-------|
| **Enable Google Auth provider** (Task 143) | User | Supabase → Providers → Google + Cloud OAuth client |
| Google `gmail.readonly` for Task 114 | User / eng | Restricted scope; start with test users |
| Resend webhook smoke | User | Secret set; redeploy + send test to masked address |
| Cloud Run apply worker | User / eng | Set `APPLY_WORKER_URL` + `APPLY_WORKER_SECRET` — [CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md) |

Migrations 001–**024** applied remotely — see [supabase/MIGRATIONS.md](./supabase/MIGRATIONS.md).

## Next recommended tasks

1. **Live smoke** — Emerson (or similar) tailor + GitHub sync enrich suggestions + review overlay layout
2. **Wire Cloud Run** apply worker so Auto-apply leaves setup-needed mode
3. **Task 147** — extension assist CTA when already on ATS
4. **Task 143** — Enable Google in Supabase ([AUTH.md](./AUTH.md) §3)

Parallel rule: different files = OK; same file / shared docs = sequential. Stale “IN PROGRESS” tasks (106, 114, 117, 143) are human-blocked or parked — not active coding lanes.

Docs: [PROFILE-MASTER.md](./PROFILE-MASTER.md) · [TAILOR-EDIT.md](./TAILOR-EDIT.md) · [REMAINING-WORK.md](./REMAINING-WORK.md) · [DECISIONS.md](./DECISIONS.md) · [AUTH.md](./AUTH.md) · [EXTENSION.md](./EXTENSION.md) · [AUTO-APPLY.md](./AUTO-APPLY.md)
