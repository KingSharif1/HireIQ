# HireIQ Decisions

## 2026-08-09 — Extension autofill: animate + AI drafts + write-back (grill lock)

**Context:** User wants Jobright-like watch-it-fill, AI drafts for unanswered questions with Accept/Edit/Skip, gray provisional text, PDF attach when tailored export exists, and write-back to job + optional master.

**Locks:**
| Area | Choice |
|------|--------|
| Write-back | Job resume/answers now; optional promote to master with provenance |
| Review UX | Hybrid panel cards + scroll/highlight field on page |
| AI scope | Any empty non-file field; sensitive only if already on profile |
| Provisional UI | Pre-fill AI drafts in muted gray until Accept |
| Master promote | Prompt after each Accept on lasting facts (not pure job essays) |
| PDF | Autofill attaches tailored PDF if exists; else Generate & attach CTA |
| Autofill click | Auto-save job silently, then known fill → AI drafts → PDF if ready |
| Ship | One pass (full loop) |

**Tradeoff:** Screening answers stored on the application (not a silent answer bank for future ATS forms). Master only via explicit promote.

**Revisit if:** PDF attach fails on custom dropzones; AI draft cost too high → batch/limit fields.

---

**Context:** End users shouldn't fight `chromiumapp.org` redirects or paste tokens. Same HireIQ login (Google or email) should unlock the extension.

**Choice:** Primary flow opens `/extension/connect` in a normal tab → mints one-time `hiqc_` code → `chrome.runtime.sendMessage` (externally_connectable) → extension stores Supabase access/refresh. Fallbacks: Advanced Google via `chrome.identity`, legacy `hiq_` tokens. ATS “needs account”: detect wall, user creates account themselves, store `applications.ats_account_email` — never invent mask emails.

**Tradeoff:** Connect codes briefly store access/refresh server-side (hashed code, TTL, one-time). Simpler UX than identity OAuth for local/dev and Store builds.

**Revisit if:** Token storage on `extension_connect_codes` becomes a compliance issue (encrypt at rest / shorter TTL) or Chrome tightens externally_connectable.

---

## 2026-08-09 — Profile = master resume (unified IA)

**Context:** Profile was split into a hub (Documents vs Professional) plus a separate Teal `/builder/master` workspace. User wants Profile to be the living master resume (docs + career truth + accept/deny), and Teal tools only on per-job resumes.

**Choice (grill lock — all A):**
| Area | Lock |
|------|------|
| Profile home | One page with **section nav** (Documents + master sections). One section at a time — no stacking Documents above every editor. |
| Master updates | Accept/deny **on the section they belong to** (badge in nav); never silent overwrite (empty master may seed from first parse). |
| Accept → thin entry | Opens follow-up sheet before commit. Required: title/name + ≥1 bullet. Optional (skippable): dates, company/URL, tech. |
| Provenance | Muted `From …` line under entry/bullet; link when possible (job / GitHub). |
| Promote to master | Explicit **Suggest for master** only — tailor generate must not auto-queue pending. |
| `/builder/master` | Retired; library only; Teal tabs only on job Documents editor |
| Job editor | Full-bleed Teal tabs + zoom/pan preview (follow-up task) |
| Tailor | Master vs job → gaps → questions → job copy |
| Upload | Always keep file; re-upload = pending diff if master filled |
| GitHub | Pending project proposals on Profile (private OK with OAuth limits) |
| Email | Per-job inbox + Applications “All outreach” (Gmail later) |
| Build order | Profile unify → job editor → tailor/suggest → outreach → GitHub proposals |

**Tradeoff:** Removes Teal chrome from master editing; Builder library + Profile Documents remain two doors on the same `resumes` set.

**Revisit if:** Nav feels crowded (collapse Builder library) or pending volume needs a dedicated inbox.

---

## 2026-08-10 — Masked inbound email (Resend), not Gmail read

**Context:** Application tracking needs employer replies without requesting `gmail.readonly` (CASA). User verified receiving on `mail.kingsharif.com` via Resend.

**Choice:** One masked address per user (`profiles.masked_email`); Relayed through Resend inbound webhook → `inbound_email_events` (canonical) + matched rows into bounded `applications.email_log` for existing All outreach / Email UI. Optional forward to real inbox via Resend Send (`RESEND_FORWARD_FROM`).

**Tradeoff:** Attribution to a job is heuristic (company in subject/from); unmatched mail still notifies and stores relationally. JSONB log stays a view adapter, not the primary store for provider mail.

**Revisit if:** Need per-job aliases (`+jobid`) or LLM status classification.

---

## 2026-08-05 — Tracker Activity + inbox data boundary

**Context:** The full-page application detail needed a Sprout-style timeline and inbox before Gmail ingestion exists. Current storage provides bounded `applications.email_log` JSONB plus relational `application_events`.

**Choice:** Activity combines private notes, status changes, manual events, and email-linked events. Email gets a separate inbox/detail UI. Manual messages remain in `applications.email_log` and are adapted into provider-neutral threads; each new manual message also writes an `email_linked` event. Future Gmail sync must use dedicated message/thread storage and adapt into the same UI model rather than placing unbounded inbox bodies on the application row.

**Tradeoff:** Manual logging ships without schema work and legacy entries remain readable. JSONB is intentionally not treated as a scalable Gmail store, so provider ingestion remains a separate Phase 2 subsystem.

**Revisit if:** Gmail or forwarded-email ingestion begins; design the additive child tables, token security, retention, and RLS before connecting a provider.

---

## 2026-06-29 — Product scope: two pillars

**Context:** Older spec described a full "Job Search OS." New spec (SPEC.md v1.0) focuses on resume tailoring + application tracking only.

**Choice:** Treat cover letter, outreach, interview prep as secondary. Phase 1 follows spec order; do not delete working cover-letter code yet.

**Revisit if:** Users consistently ask for cover letter in MVP feedback.

---

## 2026-08-04 — IA reset: Teal tracker × Sprout profile (grill)

**Context:** Prior “Teal parity” ship merged Profile into Resume Builder chrome and used a job side drawer. User rejected that shape — wants Sprout Profile + Teal Applications + Teal Resume Builder library, simple upload→tailor→apply loop.

**Choice:** See [DESIGN-IA-RESET.md](./DESIGN-IA-RESET.md). Summary:

| Area | Lock |
|------|------|
| Nav | Dashboard · Applications · Resume Builder; Profile via account icon only |
| Profile | Documents + Professional Profile (Sprout); same resume library as Builder |
| Applications | Teal list default + Board; **full-page** job detail (not drawer) |
| Job detail tabs v1 | Overview · Job description · Documents · Questions · Notes · Email · Timeline |
| Statuses | Full Teal set (bookmarked…rejected) |
| Tailor entry | Job detail (primary) + Resume Builder (both) |
| Master updates | Classify enrich vs new; accept/deny; 24h soft-keep only for enrichments |
| Chrome | Save→tracker first; then autofill+submit as one feature; masked accounts later; no password-reset hacks |
| Build first | Applications full-page rewrite |

**Tradeoff:** Reworks recent drawer/builder chrome; clearer product, less thrash long-term.

**Revisit if:** Contacts/Check List needed in job detail before extension ships.

---

## 2026-06-29 — Repo layout: code vs docs

**Context:** Root cluttered with specs, prototypes, SQL migrations, dev scripts.

**Choice:**
- `main` = `app/`, `components/`, `lib/`, `store/`, `types/`, config
- `docs/` = SPEC, session docs, `prototype/`, `scripts/`, `supabase/migrations/`

**Tradeoff:** Migration path is `docs/supabase/migrations/` not conventional `supabase/` at root. Documented in README.

**Revisit if:** We adopt Supabase CLI local dev and need standard `supabase/` layout — could symlink or move migrations back with `config.toml` only at root.

---

## 2026-06-29 — Profile storage: JSONB first, normalized tables later

**Context:** Spec defines `experiences`, `projects`, `skills` tables. App already uses `profiles.profile_data` and `resumes.structured_data` JSONB with provenance.

**Choice:** Keep JSONB for Phase 1. Add normalized tables when GitHub sync and application events need relational queries.

**Tradeoff:** Simpler ship; harder to query "all users with skill X" later.

**Revisit if:** Task 105 (GitHub) or analytics need SQL joins on experiences.

---

## 2026-06-29 — PDF export: @react-pdf/renderer

**Context:** Spec suggests Puppeteer/Playwright for PDF. App uses `@react-pdf/renderer` for Vercel serverless compatibility.

**Choice:** Keep react-pdf. Layout QA (spec §3.5) runs on structured data + render metrics, not headless Chrome.

**Revisit if:** Visual fidelity requirements exceed react-pdf capabilities.

---

## 2026-06-29 — Applications: extend `jobs` table short-term

**Context:** Spec has dedicated `applications` table. App already tracks `application_status` on `jobs`.

**Choice:** Task 107 adds `applications` additively and backfills from `jobs`. No destructive migration.

**Revisit if:** Schema duplication becomes confusing — then deprecate job-status columns on `jobs`.

---

## 2026-08-02 — Design Mode: full Teal-style + responsive

**Context:** Teal recon showed Designer is a deep theme engine (Presentation / Sections / Settings / Advanced). Locked Teal-parity plan originally only specified PDFViewer with a fixed export template.

**Choice:** Full Teal-style Design Mode for HireIQ. **Theme means visual design only** (color, shape, typography, spacing, alignments, section chrome) — not resume content or JD matching. Theme JSON drives the existing `@react-pdf/renderer` template via props (no second HTML renderer). Builder chrome must work on **mobile and web** (stacked panels on small screens). **No template library** — one HireIQ default seed; all variation through Designer controls.

**Storage:** Master theme on profile + optional per-job override on `tailored_resumes` (merge at render). Job Hub can tweak look for one application without changing the master.

**Tradeoff:** Larger surface area and a theme schema to maintain; better product parity and export fidelity. Per-job overrides add merge logic but avoid forcing one look for every application.

**Revisit if:** Theme props explode PDF complexity — then split into “core theme” vs “advanced spacing” phases inside Task 112b.

---

## 2026-08-03 — Teal chrome + HireIQ master (IA rewrite)

**Context:** User wants Teal’s UI (Home tiles, builder tabs, Content Editor checkboxes, tracker table/board, job drawer) but HireIQ’s master-resume model (parse + Q&A grow one profile with provenance). Tailor stepper feels disconnected.

**Choice:** Copy Teal structure/UX; keep HireIQ theme tokens. One master `profile_data`. Per-job include/exclude on `tailored_resumes.inclusion`. Kill Tailor stepper from nav. Tracker drawer is job detail. Statuses expanded to Teal + Rejected. Nav: Home · Resume Builder · Job Tracker.

**Tradeoff:** Large UI rewrite; old Job Hub and Tailor routes become redirects. Avoids dual product models (multi-resume vs master).

**Superseded in part by 2026-08-04 IA reset:** Profile ≠ Resume Builder chrome; job detail = **full page** not drawer; nav = Dashboard · Applications · Resume Builder (+ Profile via icon). See DESIGN-IA-RESET.md.

**Revisit if:** Users demand multiple named resume documents — then introduce lightweight “views” still backed by master + inclusion maps.

---

## 2026-06-29 — Auth proxy: Next.js 16 `proxy.ts` (not `middleware.ts`)

**Context:** Task 104 initially used `middleware.ts` re-exporting from `proxy.ts`. Next.js 16 renamed middleware → proxy; having both files errors; `config` must be defined in the proxy file (not re-exported).

**Choice:** Single `proxy.ts` at repo root with inline `config`. Session refresh + route guards live there. Docs reference `proxy.ts`.

**Revisit if:** Next.js changes the proxy convention again — follow their codemod/docs.
