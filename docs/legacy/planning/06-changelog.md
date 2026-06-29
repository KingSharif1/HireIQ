# 06 — Changelog

> Running log of what actually got built. Newest at the top. Keep `05-roadmap.md` checkboxes
> in sync.

## 2026-06-14 — P0 visual fixes (light-mode contrast, score colors, purple token)

**What changed:** Fixed critical light-mode readability and score-color bugs from the UI audit.
- Replaced `text-white` with `text-foreground` on card/surface headings (Sidebar logo, login/signup,
  Tailor, Jobs, Resume upload/view, Profile workspace, MatchScore center, TailorStepper labels).
  Kept `text-white` only on colored fills (logo chip, success buttons, avatar gradient, stepper circles).
- Applications list fit scores now use `scoreColor()` — red/amber/green by value (was always green).
- `brand.purple` in Tailwind now maps to `hsl(var(--primary))` so purple accents follow the theme token.

**Files:** `tailwind.config.ts`, `app/dashboard/page.tsx`, `components/shared/Sidebar.tsx`,
`app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `components/profile/ProfileWorkspace.tsx`,
`components/profile/primitives.tsx`, `app/dashboard/tailor/page.tsx`, `app/dashboard/jobs/page.tsx`,
`app/dashboard/resume/upload/page.tsx`, `app/dashboard/resume/[id]/page.tsx`,
`components/tailor/MatchScore.tsx`, `components/tailor/TailorStepper.tsx`
**Why:** Light-mode audit found invisible logo/headings (`text-white` on white cards) and misleading
green fit scores for 42–45% matches.
**Verified:** lint pass, vitest 51/51, `tsc --noEmit` pass, Playwright ui-shots 14/14 (login + 6 screens × 2 themes).
**Next:** P1 — PageContainer/PageHeader, unified Tailor flow, Applications card polish.

## 2026-06-14 — Interactive redesign prototype + ATS research

**What changed:** Built a clickable UI prototype of the redesign vision and researched ATS internals.
- **Prototype** `prototype/hireiq-redesign.html` — single self-contained file, 5 clickable views
  (Applications, unified Tailor flow, Master Profile w/ GitHub + answer memory, Job Hub w/ ATS panel,
  Alerts), dark+light toggle. Captures the full vision: paste job → analyze → hybrid Q&A → result;
  GitHub-connected projects with cached summaries; answer-memory bank; write-back that **updates the
  existing project** instead of duplicating; research-backed ATS readiness checklist.
- **Screenshot harness** `scripts/proto-shots.mjs` — renders every view × theme to `.ui-audit/`.
- **New doc** `15-ats-research.md` — what Workday/Greenhouse/Lever/iCIMS/Taleo actually check
  (single-column, standard headers, MM/YYYY dates, no tables, contact in body, exact keywords,
  no white-text; Taleo strictest → optimize for it). Drives engine rules + Job Hub ATS panel.

**Files:** `prototype/hireiq-redesign.html` (new), `scripts/proto-shots.mjs` (new),
`_docs/15-ats-research.md` (new)
**Why:** User asked for an interactive mock of every redesigned view, and for real ATS research to
ground the tailoring. Clarified the core vision: hold everything (resume + GitHub + remembered Q&A),
auto-tailor honestly per job, write answers back to the right place, be ATS-aware — all to land interviews.
**Decisions made:** Delivered as an HTML prototype (specific clickable deliverable) rather than a
canvas, since the user wanted a faithful navigable UI mock. Engine should target Taleo-strict formatting.
**Learned:** ATS parsers only hit ~87% field accuracy on clean docs; 2-page resumes are fine; knockout
questions are the real filter; hidden-keyword stuffing is actively penalized.
**Next:** Decide build order to make the prototype real — P0 visual fixes vs GitHub integration vs
unified tailor flow vs ATS-panel/health upgrades.

## 2026-06-14 — Verification workflow + Playwright UI testing harness

**What changed:** Added a permanent verification ladder rule and a real browser-test harness.
- **New rule** `.cursor/rules/verification.mdc` (alwaysApply) — risk-tiered verify order:
  (1) code review like a senior dev (lint/tests/types, failure cases, simplification),
  (2) MCP confirm when data/DB touched, (3) UI test when UX changes — curl for cheap route
  checks + Playwright for real click-through, reviewed as **senior dev/designer AND new user**.
  Headed browser by default. Report = what tested / pass-fail / issues (severity) / improvements.
  Fix-then-report gate. "Simple but great" design philosophy. Use `/grill-me` to fill gaps.
- **Playwright harness** `scripts/ui-shots.mjs` — logs in, walks key screens, screenshots
  light+dark. Credentials now read from `.env.local` (`TEST_USER_EMAIL` / `TEST_USER_PASSWORD`),
  **no hardcoded secrets**. `--headed` flag + `npm run ui:shots` / `ui:shots:headed`.
- **Hygiene:** `.ui-audit/` screenshots gitignored; `playwright` added as devDependency.

**Files:** `.cursor/rules/verification.mdc` (new), `scripts/ui-shots.mjs` (new),
`.gitignore`, `package.json`
**Why:** User wants every change verified like a senior dev + a real user, with visible UI tests,
and wanted the workflow codified as a rule.
**Decisions made:** risk-tiered triggers (not full ladder on every edit); headed-by-default;
creds in gitignored `.env.local` (I never write the secret — user pastes it); fix-then-report.
**Learned:** Next dev server (Turbopack) started 404-ing every route after a workspace-path change;
a stale-process kill + `.next` cache clear + restart fixed it.
**Next:** Add `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` to `.env.local`, then resume the interactive
design-audit canvas from the captured screenshots.

## 2026-06-14 — Tailor Q&A overhaul (Pass 1): fix broken question data flow + hybrid UI

**What changed:** The gap-question answers were silently broken end-to-end. The frontend only sent
`{ questionId: answer }` to `/api/tailor/generate`, so:
1. The Job Hub Questions tab saved `question: questionId` (literally `"q1"`) — users saw garbage, not
   the real question.
2. The tailoring prompt received `Q: q1\nA: <answer>` — the model never saw the actual question text,
   so answers barely influenced the rewrite ("no improvement at all").
3. The AI-generated `example_answer` existed in the type but was never rendered.

Fixes:
- **Data flow:** the tailor page now sends `questions: [{id, question}]` alongside `answers`. The
  generate route builds a `questionId → question text` map (`questionLabels`) and uses it for (a) the
  saved `gap_answers.question`, (b) the `resume_enhancements.question` row, and (c) the AI prompt.
- **Engine:** `formatEnhancements(answers, labels?)` now emits the real `Q: <question text>` so the
  model gets full context. `runTailorPipeline` accepts an optional `questionLabels` and threads it through.
- **Hybrid Q&A UI:** `QuestionFlow` rebuilt — AI-suggested **quick-answer choices** (tap-to-fill chips),
  a collapsible **example answer** with "Start from this", and an optional **"Write my own answer"**
  free-text path for going deeper. Progress bar reflects answered state.
- **Question generator prompt** now also returns `choices[]` (2-4 realistic options) and a stronger
  grounded `example_answer`.
- **Job Hub Questions tab** redesigned with clear Q/A rows.

**Files:** `types/index.ts`, `lib/ai/prompts.ts`, `lib/ai/tailor-engine.ts`, `lib/ai/tailor-pipeline.ts`,
`app/api/tailor/generate/route.ts`, `app/dashboard/tailor/page.tsx`, `components/tailor/QuestionFlow.tsx`,
`components/jobs/JobHub.tsx`, `lib/api/client.ts`
**Data flows affected:** Tailor flow (Q&A → generate → tailored_resumes/gap_answers + prompt enhancements).
**Why:** User reported the Questions tab showed nothing meaningful and the resume wasn't actually being
tailored from answers.
**Decisions made:** Hybrid Q&A (AI choices + free text), optional deeper write-your-own path (not a full
chat yet). Kept `answers` wire format as `Record<id, text>` and resolved labels server-side to minimize
churn / keep tests green (16/16 pass).
**Next:** Pass 2 — URL-driven tailor entry (paste URL/desc → extract → show nicely → ask grounded
questions), then GitHub integration (cached "what I build" summary, re-read only on repo changes).

## 2026-06-14 — Fix retired Haiku model breaking tailor generate

**What changed:** Tailor flow failed at step 4 (generate) with error `model: claude-3-5-haiku-20241022`
because Haiku 3.5 was retired by Anthropic (Feb 2026). Updated `lib/ai/models.ts`:
`fast` → `claude-haiku-4-5-20251001`, `strong` → `claude-sonnet-4-6`. All API routes now import
from `AI_MODELS` instead of hardcoded strings. Friendlier error message for model deprecation.
**Files:** `lib/ai/models.ts`, `lib/ai/error-response.ts`, `app/api/{jobs/analyze,tailor/questions,tailor/cover-letter,resume/parse}/route.ts`
**Why:** User hit 500 during tailor generate after answering gap questions.

## 2026-06-14 — Fix Ashby job URL scraper (422)

**What changed:** Second design-review round (1 product call confirmed: deterministic polish pass over true vision).

- **Sprout-style multi-page preview** — `ResumePreview` rebuilt to render **discrete page sheets**
  (Page 1 / Page 2 cards with gaps) instead of a red dashed line on one continuous sheet. A hidden
  measurer computes page count; content is sliced per page via clipped windows + `translateY`. Keeps
  zoom/fit + page-count target.
- **Deterministic polish pass** (the cheap half of "AI sees the resume"):
  - `lib/format/normalize.ts` — `toTitleCaseName` / `normalizeResumeForDisplay` fixes name casing
    (`sharif ahmed` → `Sharif Ahmed`). Applied in the **preview AND both exporters** so screen = download.
  - `lib/resume/health.ts` — ATS-style checks (name case, contact, summary, page length vs seniority,
    quantified bullets, bullet length, skills) + a 0–100 score, shown as a **Resume health** panel in the hub.
  - **Note:** the *tailor engine itself still works on structured text* — true visual/vision review is v2.
- **Cover letter downloadable** — `CoverLetterPDF` (react-pdf) + `generateCoverDocx` (docx). `/api/export/pdf`
  and `/api/export/docx` now accept `type: 'resume' | 'cover'`. Job hub cover tab has PDF/DOCX buttons.
- **Resume management consolidated** — `ResumesSection` (Profile → Resumes) now has **inline actions**
  (view original upload, replace/upload, delete with confirm). The standalone `/dashboard/resume` list
  **redirects** to `Profile → Resumes`. `ResumeCard` is now unused.
- **Job hub UI** — gradient header banner with company icon, primary "Tailor again" CTA, motion entrances.
- **Files:** `lib/format/normalize.ts`, `lib/resume/health.ts`, `resume/ResumePreview.tsx`,
  `export/pdf-generator.tsx`, `export/docx-generator.ts`, `api/export/{pdf,docx}/route.ts`,
  `jobs/JobHub.tsx`, `profile/sections.tsx`, `profile/ProfileWorkspace.tsx`,
  `app/dashboard/profile/page.tsx`, `app/dashboard/resume/page.tsx`.
- **Data flows affected:** exports normalize the name before render; resume mgmt routes through the profile;
  cover-letter export reads `tailored_resumes.cover_letter` + contact.
- **Decisions:** Q40 (deterministic polish pass now, vision v2), Q41 (resume mgmt inside profile) — logged.
- **Gate:** lint clean, 50 tests pass, build green.
- **Next:** GitHub integration (v2), optional vision review (v2), re-add change-summary diff in hub.

## 2026-06-14 — UX overhaul: collapsible nav, profile menu, preview pagination, hub consolidation

**What changed:** Acted on a full design-review from the user (5 product calls confirmed via prompt).

- **Collapsible left sidebar** — new `components/shared/DashboardShell.tsx` owns a persisted
  (`localStorage`) collapse state and animates the main content margin. `Sidebar.tsx` rewritten with
  an icons-only collapsed mode (tooltips) + expand/collapse toggle.
- **Profile menu + avatar** — `Sign out` moved out of the sidebar into a dropdown on a new avatar
  (`components/ui/avatar.tsx`, `dropdown-menu.tsx`). Theme toggle + Profile link live there too.
- **Resume preview pagination** — `ResumePreview` now measures content height, shows a live
  **page count** with a warning when it exceeds the seniority recommendation (entry/junior = 1 page),
  draws red dashed **page-break guides**, and has **zoom + fit-to-width** controls.
- **Job hub** — right-sidebar sections are now **collapsible** (`components/ui/collapsible-section.tsx`):
  Fit / Application / Timeline (moved here from a tab) / Job details. Cover-letter generation now happens
  **inline in the hub** (streaming), Questions tab has a clearer empty state, subtle framer-motion entrances.
- **Consolidation** — the standalone tailor result page (`/dashboard/tailor/[id]`) is now a **redirect**
  to the job hub (single home per job). Tailoring lands on the job hub. Score card bug fixed
  (`+-42`/`--` → correct `+N`/`−N`/`±0` with up/down color).
- **Master-only tailoring** — removed the "Tailor to a Job" button on the resume page; tailoring always
  uses the master profile. Resume page now offers **"View original upload"** instead.
- **Dashboard** — removed the redundant "Recent tailored resumes" block (job cards already show fit/status).
- **Files:** `DashboardShell.tsx`, `Sidebar.tsx`, `ui/avatar.tsx`, `ui/dropdown-menu.tsx`,
  `ui/collapsible-section.tsx`, `resume/ResumePreview.tsx`, `jobs/JobHub.tsx`, `app/dashboard/layout.tsx`,
  `app/dashboard/page.tsx`, `app/dashboard/tailor/page.tsx`, `app/dashboard/tailor/[id]/page.tsx`,
  `app/dashboard/resume/[id]/page.tsx`.
- **Data flows affected:** tailor → now lands on `/dashboard/jobs/[id]`; resume picker fully removed from
  the tailor flow (master profile is the only source); cover-letter generation reachable from the hub.
- **Why:** user design review — declutter, match Sprout, make the hub the single source of truth.
- **Decisions:** master-only tailoring + result-page→hub merge logged in `01-decisions.md`. GitHub
  integration deferred to v2 (`07-v2-backlog.md`).
- **Gate:** lint clean, 50 tests pass, production build green.
- **Next:** GitHub repo integration (v2), re-add a "What changed" diff inside the hub, masked inbox.

## 2026-06-14 — Phase 5: Job hub + download preview + versions

- **Migration 005** (applied via MCP, verified): `jobs.application_status`, `jobs.tailoring_status`,
  `jobs.updated_at`; `tailored_resumes.version`, `gap_answers`, `user_edited` + version index.
  Additive/idempotent; 1 existing job + 1 tailored row safely defaulted.
- **Job hub** `/dashboard/jobs/[id]` (`components/jobs/JobHub.tsx`): 2-pane Sprout-style layout —
  center tabs Documents / Questions / Timeline; right sidebar fit score + application status (editable)
  + job details.
- **Download preview** `components/resume/ResumePreview.tsx`: HTML WYSIWYG mirroring `pdf-generator.tsx`
  (Letter page, same fonts/sizes) so users see exactly what downloads. Export PDF/DOCX from the hub.
- **Versions:** tailor generate now stamps `version` (max+1 per job) + `gap_answers`; sets job
  `tailoring_status='tailored'`. Version dropdown + Questions tab read these.
- **Wiring:** Applications cards link to the job hub. `lib/jobs/status.ts` for status labels/colors.
- **Global rule:** added `~/.cursor/rules/database-and-change-safety.mdc` (senior-engineer DB pre-flight).
- **Gate:** 50 tests + build + lint green.
- **Next:** masked inbox, upload cap, change summary in Documents tab.

## 2026-06-14 — Migration 004 applied via MCP

- Ran `notifications` table + RLS on Supabase project `wsbbgznobxhjefaqbniv` (HIreIQ) using the
  plugin Supabase MCP `apply_migration`. Verified 9 columns + 4 RLS policies (select/insert/update/delete own).
- Made the migration idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`) so re-runs are safe.
- Alerts page + sidebar badge now functional against the live DB.

## 2026-06-14 — Sprout nav + bug fixes + resume delete

- **Nav:** Sidebar/mobile now **Applications · Alerts · Tailor** (+ Profile). Resumes/Jobs removed from main nav per Q19.
- **Applications home:** `/dashboard` lists jobs with tailored/not-started state.
- **MatchScore NaN:** ATS scorer handles year-only dates + partial job JSON; `MatchScore` clamps display.
- **Resume delete:** `DELETE /api/resume/[id]` + confirm trash on resume cards.
- **Notifications:** Graceful setup message when migration 004 not applied; layout ignores missing table.
- **Docs:** `14-sprout-ui-gap.md`, full `_docs/README.md` + `STATUS.md` refresh.
- **Next:** Phase 5 job detail 2-pane + document versions.

## 2026-06-14 — Phase 4: Notifications + badges

- **Migration:** `supabase/migrations/004_notifications.sql` — table + RLS + indexes.
- **Lib:** `lib/notifications.ts` — builders, unread count formatting, sort helpers.
- **API:** `GET/PATCH /api/notifications`; tailor generate inserts `tailor_complete` + `suggestion` rows.
- **UI:** `/dashboard/notifications`, `UnreadBadge` on sidebar + mobile nav, `NotificationsList`.
- **Wiring:** Accept/decline clears suggestion notifications when pending for that tailor run is empty.
- **Tests:** 6 new tests (49 total); build + lint green.
- **Why:** Q12–Q13 — layered review with dedicated notification store.
- **Next:** Apply migration in Supabase, manual QA, then Phase 5.

## 2026-06-14 — Phase 3: Write-back + provenance

- **Types:** `ProvenanceEntry`, `PendingSuggestion`, `bulletIds` on experience entries in `types/index.ts`.
- **Lib:** `lib/profile/bullets.ts` (stable IDs, heavy-edit threshold), `lib/profile/provenance.ts`
  (accept/decline, normalize, write-back merge, timeline formatting).
- **API:** `/api/profile/suggestions` (accept/decline); `/api/tailor/generate` persists pending suggestions.
- **UI:** `PendingSuggestionsPanel`, `ProvenanceBulletEditor` (purple tailor tint + hover timeline),
  amber pending badge on Experience nav, tailor result nudge card, `?section=experience` deep link.
- **Component:** `components/ui/tooltip.tsx` (Radix tooltip for provenance timeline).
- **Tests:** 7 new tests in `lib/profile/__tests__/provenance.test.ts` (43 total); build + lint green.
- **Why:** Q10–Q12 — layered review, provenance sidecar, honest write-back from gap answers.
- **Next:** Manual QA, then Phase 4 notifications table + sidebar badge.

## 2026-06-14 — Phase 2 manual QA confirmed

- User verified tailor flow end-to-end in browser. Phase 2 gate fully closed.

## 2026-06-14 — Lint toolchain fixed + green gate

- **ESLint pinned to v9** (was 10) — ESLint 10 crashed `eslint-plugin-react` bundled in
  `eslint-config-next@16`. v9 satisfies the peer dep and the full Next plugin stack works.
  Decision logged as **T2** in `01-decisions.md`.
- **Lint command** switched `next lint` → `eslint .` (`next lint` removed in Next 16). Flat
  config in `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` (T3).
- **Fixed 3 lint findings:**
  - Removed 2 stale `eslint-disable` directives (`pdf/route.ts`, `resume/parse/route.ts`) —
    rules no longer fire under the new stack.
  - `ThemeToggle.tsx`: documented the next-themes hydration guard + targeted disable for
    `react-hooks/set-state-in-effect` (intentional one-time mount flag).
- **Gate now fully green:** `npm test` (20 passed) + `npm run build` + `npm run lint` (0 problems).
- **Files:** `package.json`, `eslint.config.mjs`, `components/shared/ThemeToggle.tsx`,
  `app/api/export/pdf/route.ts`, `app/api/resume/parse/route.ts`.
- **Next:** Phase 2 tailor engine.

## 2026-06-14 — Phase 2: Tailor engine upgrade

- **Pipeline:** `lib/ai/tailor-pipeline.ts` — generate (Sonnet) → critique (Haiku) → targeted
  regenerate (max 2 retries) → final critique (Sonnet).
- **Prompts:** `TAILOR_GENERATE_PROMPT`, `TAILOR_CRITIQUE_PROMPT`, `TAILOR_REGENERATE_PROMPT`
  in `lib/ai/prompts.ts`; honesty + seniority length budget in generate prompt.
- **Pure logic:** `lib/ai/tailor-engine.ts` — gate (≥70%, zero unsupported claims), diff with
  `changeType`, write-back suggestions from Q&A answers.
- **Models:** `lib/ai/models.ts` — Sonnet strong, Haiku fast, max 8 AI calls/run.
- **API:** `/api/tailor/generate` returns `meta` (overlap, warning, attempts), `writeBackSuggestions`.
- **Tests:** 16 new tests (36 total); all pass + build + lint.
- **Why:** Q4–Q8, Q14 — two-pass critique, scored loop, tiered models, honest tailoring.
- **Next:** Manual tailor QA (Anthropic credits), then Phase 3 write-back.

## 2026-06-14 — Phase 1 complete (manual QA)

- User verified in browser: profile edit → tailor step 1 reflects change; light/dark toggle OK.
- Phase 1 gate fully closed: test + build + lint + manual QA.

## 2026-06-14 — Phase 1 verification: tests + bug fix

- **Testing:** Added `vitest` + `npm test` with 20 unit tests in `lib/profile/__tests__/`.
  Covers profile-as-master, seed-on-upload, edit→tailor round-trip, `getMasterResumeContext`.
- **Bug fix:** `getMasterResumeContext` now checks `hasProfileContent` on **stored** profile only
  (`resolveProfileData(profile, null)`), not merged resume seed — fixes wrong `source: 'profile'`
  when profile_data was empty but a resume existed.
- **Docs:** `13-phase-verification.md` — gate criteria per phase (implement + test before next).
- **Build:** `npm run build` passes. All 20 tests pass.
- **Manual QA still open:** browser check profile save → tailor step 1 + theme toggle.
- **Next:** Phase 2 tailor engine.

## 2026-06-14 — Documentation sprint: full v1 picture

- **Goal:** document everything before next build phase so the team has one source of truth.
- **New docs:**
  - `STATUS.md` — current progress, what exists in code, flags
  - `08-v1-product-spec.md` — v1 contract, pillars, status model, success criteria
  - `09-user-flows.md` — all user + data flows end-to-end
  - `10-screens-and-ia.md` — every screen, 2-pane job layout, routes, component inventory
  - `11-email-tracking.md` — masked inbox architecture, schema, provider options
  - `12-sprout-research.md` — credits, whisperpost, credentials, UI mapping
- **Updated:** `README.md`, `00-overview.md`, `02-data-model.md`, `04-ui-theme.md`, `05-roadmap.md`
- **Why:** user requested clear picture of where we're going before building.
- **Next:** review docs together → Phase 2 tailor engine OR Phase 5 UI shell (stub).

## 2026-06-14 — Research: Sprout credits, credentials, email tracking → v1 scope

- **Researched** Sprout help center: 1 vs 3 credits, whisperpost masked email, Application Credentials.
- **Corrected Q31:** Sprout creates **new** portal accounts with `@whisperpost.io` + generated password — does **not** reset existing user passwords. Credentials shown per job.
- **Corrected Q33:** 1 credit = standard apply; 3 credits = Workday/CAPTCHA/multi-step — **portal complexity**, not resume length.
- **Moved email tracking to v1 (Q32):** masked inbox (our domain), opt-in — no Gmail read / no CASA audit. User copies masked email when applying manually.
- **Added Q34:** tailored document panel with versions (v1, v2…), Regenerate cap, change summary vs master.
- **Files:** `01-decisions.md`, `05-roadmap.md`, `07-v2-backlog.md`.

## 2026-06-14 — Planning: grill-me batches 2 & 3 (no code)

- **Decisions logged** (`01-decisions.md` Amendments): resume mgmt + job tracker (Q19–Q28),
  auth scope + v2 auto-apply (Q29–Q31).
  - Q29: Google sign-in stays **basic profile + email only** now; Gmail read access deferred
    to v2 via incremental auth (avoids restricted-scope CASA audit + protects conversion).
  - Q30/Q31: auto-apply is v2 (agentic browser automation pattern); **no auto password
    resets** on existing employer accounts — surface to user instead.
- **Roadmap:** added Phase 5 (resume management + job tracker) and a v2 backlog pointer.
- **New doc:** `07-v2-backlog.md` — job search, email tracking, auth scope path, auto-apply,
  existing-account handling, outreach panes.
- **Why:** capture v2 research + the one v1-affecting call (auth scope) before it's lost;
  keep docs reflecting reality per project rules.
- **Next:** Phase 2 — tailor engine upgrade (two-pass critique + scored loop).

## 2026-06-12 — Phase 1: Profile-as-master + dual theme

- **Master profile layer:** `lib/profile/master.ts` — `getMasterResumeContext()` reads
  `profiles.profile_data` first, falls back to latest resume; ensures `base_resume_id` FK.
  `profileDataToStructuredResume` / `structuredResumeToProfileData` in `lib/profile/data.ts`.
- **Tailor APIs:** `/api/tailor/score`, `questions`, `generate` now use master profile data.
  `resumeId` is optional (used only for FK link).
- **Parse → seed:** `/api/resume/parse` writes into `profiles.profile_data` after upload.
- **Tailor UI:** Step 1 is now "Your profile" (not resume picker); shows completeness +
  section counts; links to profile editor.
- **Theme:** `next-themes` with system default + manual toggle in sidebar. Hand-tuned light
  and dark CSS tokens in `globals.css`. Replaced `bg-navy-*` with semantic `bg-background` /
  `bg-card`.

## 2026-06-12

- **Docs:** Created `_docs/` planning folder (git-ignored via `.gitignore` → `/_docs/`).
  Captured the full grill-me decision session: overview, decision log, data model,
  tailoring engine, UI/theme, roadmap, changelog.
- **DB:** Applied Supabase migration `profile_data` to project `wsbbgznobxhjefaqbniv`
  (HIreIQ) via MCP — added `profiles.profile_data JSONB DEFAULT '{}'`. Verified column
  exists. (Local mirror: `supabase/migrations/002_profile_data.sql`.)
- **Profile (pre-grill build):** Rebuilt `/dashboard/profile` into a Sprout-style sectioned
  workspace — inner nav (PROFILE / DOCUMENTS / PROFESSIONAL PROFILE) with count badges,
  completeness meter, sticky review/save bar, per-section forms. Files:
  `app/dashboard/profile/page.tsx`, `components/profile/ProfileWorkspace.tsx`,
  `components/profile/sections.tsx`, `components/profile/primitives.tsx`,
  `lib/profile/sections.ts`, `lib/profile/data.ts`, `types/index.ts` (`ProfileData`).
- **Fixes:** lucide-react **v1** doesn't export `Github`/`Linkedin` → swapped to
  `Code2`/`Link2`. Typecheck + lint clean.
- **Diagnostics:** Confirmed AI 500s were "credit balance too low" (not a bad key) via
  `scripts/test-anthropic-key.mjs`; added `lib/ai/error-response.ts` to surface real errors
  in dev across the AI routes.

_(Add new entries above this line as work lands.)_
