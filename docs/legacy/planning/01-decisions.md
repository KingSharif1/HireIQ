# 01 — Decision Log

> Every decision from the grill-me session (2026-06-12), with the rationale. When a
> decision changes, **add a dated entry at the bottom** under "Amendments" — don't rewrite
> history.

Legend: ✅ = decided.

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| Q1 | Source of truth | ✅ **Profile is master** | Like Sprout. Upload seeds the profile once; all tailoring reads from `profile_data`. Avoids "edited profile but tailoring didn't change" drift. |
| Q2 | Write-back trigger | ✅ **Suggest + review** | New content from gap answers appears as a pending suggestion; user clicks Accept to merge. User stays in control. |
| Q3 | Provenance granularity | ✅ **Bullet-level** | Most precise: accept one new bullet under an existing job; only that bullet gets the badge. |
| Q4 | Tailor engine | ✅ **A + C: two-pass self-critique + scored loop** | Pass 1 maps job's success language to real evidence + rewrites. Pass 2 critiques as ATS parser AND skeptical human, revises. Then score overlap; regenerate weak sections if short. |
| Q5 | Loop gating | ✅ **Balanced** | Pass = overlap ≥ 70% AND zero unsupported-claim flags. Regenerate only weak sections, **max 2 retries**, then return best with warning. (Cost-aware — user hit credit limits.) |
| Q6 | Honesty on real gaps | ✅ **A + C: ask first, and reframe wording** | No evidence → ask a gap question, never fabricate. Has evidence but weak → reframe/power up wording truthfully (no new claims). |
| Q7 | Structural changes | ✅ **Full restructure** | Reorder sections + bullets, drop/merge weak bullets, trim length. Safe because master keeps everything and user reviews the diff. |
| Q8 | Length target | ✅ **Seniority-based** | 1pg junior/mid, up to 2pg senior/lead/staff, driven by detected seniority. |
| Q8b | Tailoring basis | ✅ **Content-driven** | Length is a *budget*, not a quota. Prioritize strongest real content; never pad, never cut strong relevant material to hit a number. |
| Q9 | Version model | ✅ **Keep current structure** | Profile master + `tailored_resumes` rows (job + snapshot + diff + scores + date). "Past resumes" = tailored history. No new tables for this. |
| Q9b | Base vs tailored | ✅ **Base editable, tailored immutable** | Editing base never alters past tailored snapshots. Tailored links to base; write-backs link through that relationship. |
| Q10 | Edit keeps provenance? | ✅ **Keep unless heavily changed** | Small tweaks keep the link; substantial rewrite converts to normal base bullet — BUT see Q10b. |
| Q10b | History timeline | ✅ **Always keep full history** | Even after heavy edits, keep a mini timeline of every update (added-from-tailor date + each edit date). Hover shows it. |
| Q11 | Bullet storage | ✅ **Sidecar metadata map** | Bullets stay text; a parallel map keyed by bullet id holds `{ origin, history[] }`. Keeps parser/scorer/exports untouched; history is additive. |
| Q12 | Review surface | ✅ **Layered (all of them)** | Post-tailor nudge + notification + per-section badge + inline pre-filled preview with "why" message + Accept/Decline. |
| Q13 | Notification source | ✅ **Dedicated notifications table** | More infra now, but reusable for future job matches/reminders. |
| Q14 | Cost strategy | ✅ **Tiered models** | Strong model (Sonnet) for main generate + final critique; cheap model (Haiku) for intermediate scoring/critique passes. |
| Q15 | Build order | ✅ **Foundation first** | 1) Profile-as-master + Tailor reads profile_data. 2) Tailor engine. 3) Write-back + provenance. 4) Notifications + badges. Each phase usable alone. |
| Q16 | UI direction | ✅ **Dual theme** | Light + dark, both first-class and intentional. |
| Q17 | Theme impl | ✅ **next-themes, full token refresh, OS-default + toggle** | Auto-follow OS on first visit, manual override. Keep it simple, match existing design language. |
| Q18 | Theme sequencing | ✅ **Tokens in Phase 1, deep polish as final pass** | Set up tokens/toggle early so new screens are built themed; style every page once, together, at the end. |

## Amendments

### 2026-06-14 — Resume management, job tracker, exports (grill-me batch 2)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| Q19 | Resumes nav link | ✅ **Remove it** | No standalone "Resumes" page in the sidebar. Uploaded files live inside the profile; tailored history lives under the job tracker. |
| Q20 | Uploaded resume limit | ✅ **3 (soft cap)** | Uploads only *seed* the master profile, so we don't need many. Keep the most recent few; prune oldest past 3. |
| Q21 | New-upload handling | ✅ **Diff + review** | On re-upload, extract and merge only **new/changed** content into the master; don't blindly duplicate. Highlight what's new when the user opens it. |
| Q22 | Uploaded resume view | ✅ **Original file first** | Show the actual uploaded PDF/DOCX preview, with a toggle to view our parsed/extracted data — not the parsed text as the default. |
| Q23 | Job tracker | ✅ **Dashboard at `/dashboard`** | Central list of jobs with two status signals: a **derived tailoring status** (needs review / generated / regenerate) and a **manual application status** (set by user). |
| Q24 | Per-job page | ✅ **Sprout-like single page, simplified** | Each job gets its own detail view: job details, fit score, documents (tailored resume + cover letter), and a questions area showing what the AI asked + what it learned. |
| Q25 | Layout density | ✅ **2-section, not 3** | Sprout uses 3 panes; ours is intentionally simpler. v1 focus = search→tailor→interview; richer panes (outreach, etc.) are v2. |
| Q26 | Exports | ✅ **PDF + DOCX, same format** | Both formats from the same template. The AI must judge the **whole rendered resume** (incl. page count) on export, since layout can shift. |
| Q27 | Job source (v1) | ✅ **Bring-your-own job** | v1 = user pastes/links a job, we tailor. Job *search* is v2. |
| Q28 | Email tracking | ~~v2~~ → see Q32 | Originally deferred; user moved to v1 (2026-06-14 batch 4). |

### 2026-06-14 — Auth scope + v2 auto-apply (grill-me batch 3)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| Q29 | Google sign-in scope (now) | ✅ **Basic profile + email only** | Standard Google sign-in via Supabase. **No** Gmail read scope at signup — `gmail.readonly` is a Google *restricted scope* (yearly CASA security assessment) and asking for inbox access up front hurts trust/conversion. Email tracking uses our **own masked inbox** (Q32), not Gmail read. |
| Q30 | Auto-apply | 🔭 **v2, agentic browser automation** | Sprout's AI agent opens the employer's application page, fills fields from profile/resume, submits. A masked inbox catches verification codes/login links. **1 vs 3 credits** = portal complexity (Workday/CAPTCHA/multi-step = 3), not resume length — see Q33. Internal implementation unknown; we copy the *pattern*, not code. |
| Q31 | Existing account on apply | ✅ **Masked email avoids collision** | Sprout does **not** reset passwords on existing accounts. They create **new** employer-portal accounts using the user's unique `@whisperpost.io` address + a generated password. Credentials are saved and shown under "Application Credentials." Collision with the user's real email is avoided by design. |

### 2026-06-14 — Email tracking + document versions (grill-me batch 4)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| Q32 | Email tracking (v1) | ✅ **Masked inbox, opt-in** | Sprout does **not** read Gmail — they run `@whisperpost.io` masked addresses. We generate a per-user masked email; user uses it when applying manually in v1; we receive employer mail, parse status, forward to their real inbox. No Google CASA audit. Auto-apply in v2 uses the same inbox for verification. |
| Q33 | Credit cost model (reference) | 📋 **1 vs 3 = portal complexity** | Per Sprout help center: **1 credit** = standard applications; **3 credits** = Workday-hosted, CAPTCHA, or multi-step forms (more automation effort). Shown on job card before apply. Not about resume length or number of screening questions alone. |
| Q34 | Tailored document view (v1) | ✅ **Versions + change summary** | Per-job documents panel: Resume / Cover Letter tabs, version label (v1, v2…), Edit, Regenerate with cap (e.g. 3/3), Export (PDF + DOCX), and a **change summary** vs master (what was added/changed/removed). Matches Sprout's document UX but simpler 2-pane layout. |

### 2026-06-14 — Tooling decisions (Phase 1 verification)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| T1 | Test runner | ✅ **Vitest** | Fast, Vite-native, zero-config TS + `@/` alias. Tests live in `lib/**/__tests__/*.test.ts`. Runs in ~2s with no DB/network. Gate command: `npm test`. |
| T2 | ESLint version | ✅ **Pin to ESLint 9** | ESLint 10 broke `eslint-plugin-react` (`getFilename is not a function`) which ships inside `eslint-config-next@16`. v9 satisfies the config's `>=9` peer dep and the whole Next plugin stack works. **Revisit** when the React/Next ESLint plugins officially support v10. |
| T3 | Lint command | ✅ **`eslint .`** (was `next lint`) | `next lint` was removed in Next 16. Flat config in `eslint.config.mjs` extends `eslint-config-next/core-web-vitals`. |
| T4 | Phase gate | ✅ **test + build + lint + manual QA** | No phase is "done" until `npm test`, `npm run build`, `npm run lint` all pass and the browser QA checklist (in `13-phase-verification.md`) is done. |

### 2026-06-14 — UX overhaul (design review)

| # | Decision | Choice | Rationale | Tradeoff / revisit |
|---|----------|--------|-----------|--------------------|
| Q35 | Tailoring source | ✅ **Master profile only** | Reinforces Q1. Removed the "Tailor to a Job" button + any `?resumeId=` path; the tailor flow already read from `profile_data`. One source of truth, no "which resume?" confusion. | Lose the (unused) ability to tailor a specific uploaded snapshot. Revisit if users want per-upload targeting. |
| Q36 | Result page vs job hub | ✅ **Merge → job hub is the single home** | The standalone `/dashboard/tailor/[id]` overlapped the hub and confused the user. It now **redirects** to `/dashboard/jobs/[jobId]`; tailoring lands on the hub; cover-letter generation moved inline into the hub. | Dropped the "What changed" diff for now (logged as a follow-up to re-add inside the hub). Old links still work via redirect. |
| Q37 | Sidebar logout placement | ✅ **Profile dropdown** | Loose "Sign out" button looked unfinished. Moved into an avatar dropdown (with theme toggle + Profile link). | None significant. |
| Q38 | Sidebar collapse state | ✅ **Client shell + localStorage** | `DashboardShell` reads/writes collapse pref; effect-based read is correct (SSR can't see `localStorage`). | Needs one scoped `eslint-disable` for `set-state-in-effect`; acceptable for hydration-only state. |
| Q39 | GitHub integration | 🔭 **v2** | Real OAuth + repo analysis; sizable. Deferred so it doesn't bloat this UI pass. | See `07-v2-backlog.md`. |
| Q40 | AI "seeing" the resume | ✅ **Deterministic polish pass now; vision = v2** | The tailor engine is text-only and never saw the rendered layout (missed lowercase names, 2-page spill). Now: `normalizeResumeForDisplay` (name casing) applied in preview + both exporters, a rules-based **resume-health linter**, and page-count surfaced. True render-to-image + vision-model critique is deferred. | Deterministic checks can't catch everything a human eye would; revisit vision when tailoring loop is polished + cost is justified. |
| Q41 | Resume management home | ✅ **Inside Profile → Resumes** | Removed the separate `/dashboard/resume` list (redirects to the profile section). Resumes are *uploads that seed the master*, so they belong with the profile. Inline view-original / replace / delete. | `ResumeCard` left as dead code for now. Revisit if we need a dedicated resumes surface again. |
| Q42 | Page-break visualization | ✅ **Discrete page sheets** | The red dashed line over a continuous sheet read poorly. Switched to Sprout-style separate page cards (Page 1 / Page 2) via a hidden measurer + clipped per-page windows. | Naive slice can cut a line at the boundary (like a basic PDF); react-pdf does the real break on export. Acceptable for a preview. |
