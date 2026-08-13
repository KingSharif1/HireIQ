# HireIQ Tasks

Shared memory between agent sessions. **Claim one task, finish it, mark DONE, stop.**

Format:
```
## Task [ID] — [name]
Status: PENDING | IN PROGRESS | DONE | BLOCKED
Scope: [allowed files]
Result: [filled when done]
Files changed: [list]
```

---

## Task 100 — Repo docs + clean layout
Status: DONE  
Scope: `docs/`, root `README.md`, `package.json`, path updates  
Result: Moved prototype, scripts, supabase, specs into `docs/`. Created ARCHITECTURE, STATUS, TASKS, DECISIONS, CHANGELOG, SPEC. Updated npm script paths.  
Files changed: `docs/**`, `README.md`, `package.json`, `.gitignore`, `.cursor/rules/verification.mdc`, `app/dashboard/notifications/page.tsx`

---

## Task 101 — Structured gap analysis (spec §3.1)
Status: DONE  
Scope: `lib/ai/gap-analysis.ts`, `lib/ai/prompts.ts`, `app/api/tailor/questions/route.ts`, `components/tailor/GapAnalysisSummary.tsx`, tailor flow  
Result: 3-tier gap analysis API + summary UI before Q&A; max 3 questions; real gaps blocked in tailor prompt.  
Files changed: `lib/ai/gap-analysis.ts`, `lib/ai/prompts.ts`, `app/api/tailor/questions/route.ts`, `components/tailor/GapAnalysisSummary.tsx`, `store/index.ts`, `app/dashboard/tailor/page.tsx`, `lib/ai/tailor-pipeline.ts`

---

## Task 102 — Tracked changes accept/decline (spec §3.6)
Status: DONE  
Scope: `components/tailor/TailorDiff.tsx`, `components/jobs/JobHub.tsx`, `lib/tailor/change-decisions.ts`, `app/api/tailor/[id]/decisions/route.ts`, export routes, migration 006  
Result: Per-change accept/decline/edit with reasons; Changes tab on Job Hub; export uses approved resume only; pending changes block export.  
Files changed: `lib/tailor/change-decisions.ts`, `components/tailor/TailorDiff.tsx`, `components/jobs/JobHub.tsx`, `app/api/tailor/[id]/decisions/route.ts`, export routes, `docs/supabase/migrations/006_change_decisions.sql`

---

## Task 103 — Job fetch: Workday + LinkedIn handling (spec §2.1)
Status: DONE  
Scope: `lib/jobs/url-detect.ts`, `lib/jobs/job-scraper.ts`, `app/api/jobs/fetch-url/route.ts`, `app/dashboard/jobs/page.tsx`  
Result: Workday internal API fetch; LinkedIn blocked with paste prompt; aggregator low-confidence warning.  
Files changed: `lib/jobs/url-detect.ts`, `lib/jobs/job-scraper.ts`, `app/dashboard/jobs/page.tsx`, tests

---

## Task 104 — Basic auth hardening
Status: DONE  
Scope: `proxy.ts`, auth pages, `lib/auth/*`, migration 007, `docs/AUTH.md`  
Result: Proxy wired (session refresh + route guards); forgot/reset password; profile names on signup/OAuth; clearer errors. Removed `middleware.ts` for Next.js 16 proxy convention.  
Files changed: `proxy.ts`, `app/(auth)/*`, `lib/auth/*`, `components/auth/AuthShell.tsx`, `docs/supabase/migrations/007_auth_profile_trigger.sql`, `docs/AUTH.md`

---

## Task 105 — GitHub OAuth + repo sync (spec §1.2)
Status: DONE  
Scope: new `app/api/github/*`, `lib/github/`, migration in `docs/supabase/migrations/`, profile UI  
Result: Connect/sync/disconnect on Profile → Projects; repo metadata in `github_data`; cross-ref → pending project suggestions; migration 008.  
Files changed: `lib/github/**`, `app/api/github/**`, `components/profile/GitHubConnectPanel.tsx`, `components/profile/sections.tsx`, `components/profile/ProfileWorkspace.tsx`, `app/auth/callback/route.ts`, `lib/profile/provenance.ts`, `types/index.ts`, `docs/supabase/migrations/008_github_integration.sql`, `docs/GITHUB.md`  
**Remote (Supabase project `wsbbgznobxhjefaqbniv`):** Migration 008 (`github_data`, `github_connections`) applied via MCP 2026-06-29.

---

## Task 106 — Visual render QA pass (spec §3.5)
Status: PENDING  
Scope: `lib/export/pdf-generator.tsx`, new `lib/resume/layout-check.ts`  
Goal: After tailor, run length + placeholder + section checks; surface flags in UI before export.

---

## Task 107 — Applications schema migration (spec §4.1)
Status: DONE  
Scope: `docs/supabase/migrations/`, `types/index.ts`, `lib/supabase/queries.ts`, jobs UI  
Goal: Add `applications` + `application_events` tables; migrate existing `jobs` rows; keep reads working.  
Result: Migration 010 applied remotely. Tables + RLS + backfill (1:1 from jobs) + insert trigger. Types, queries, `setApplicationStatus` helper (mirrors `jobs.application_status` + writes events). Status APIs: `PATCH /api/applications/[id]/status`, `PATCH /api/jobs/[id]/status`. Job Hub uses job status API.  
Files changed: `docs/supabase/migrations/010_applications.sql`, `types/index.ts`, `lib/supabase/queries.ts`, `lib/applications/status.ts`, `lib/applications/__tests__/status.test.ts`, `app/api/applications/[id]/status/route.ts`, `app/api/jobs/[id]/status/route.ts`, `components/jobs/JobHub.tsx`  
Note: Additive only — `jobs` columns kept until full cutover.

---

## Task 108 — Docs sync to current state
Status: DONE  
Scope: `docs/**`, root `README.md`  
Result: All active session docs reflect Tasks 100–104, `proxy.ts`, migration status, task queue 105–107; legacy docs bannered.  
Files changed: `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/README.md`, `docs/AUTH.md`, `docs/CHANGELOG.md`, `docs/legacy/**`, `README.md`

---

## Task 109 — Teal UI recon via Playwright MCP
Status: DONE  
Scope: `docs/DESIGN-TEAL-PARITY.md`  
Result: Logged into Teal; captured Content Editor, full Designer (Presentation/Sections/Settings/Advanced), Analyzer (65% overall + issue buckets), Job Matcher (match score + keyword groups), Job Tracker Table + Board. Design Mode is a major underspecified gap — awaiting scope decision before Task 110.  
Files changed: `docs/DESIGN-TEAL-PARITY.md` (recon section)

---

## Task 110 — Job Hub workspace: non-linear panels + live preview
Status: DONE  
Scope: `components/jobs/JobHub.tsx`, new `components/jobs/workspace/*`, `app/dashboard/jobs/*`  
Result: Teal-style split — left panels (Match Score / Keywords / Changes / Q&A / Job) + right sticky live `ResumePreview`. Score updates live via client `calculateATSScore` on accept/decline; persist via Task 111 on save. Responsive stack on mobile.  
Files changed: `components/jobs/JobHub.tsx`, `components/jobs/workspace/WorkspaceShell.tsx`, `components/jobs/workspace/KeywordPanel.tsx`

## Task 111 — Live re-score on change decisions
Status: DONE  
Scope: new `app/api/tailor/[id]/score/route.ts`, `lib/scoring/tailored-rescore.ts`, workspace score header  
Goal: Recompute ATS score + matched/missing keywords after every accept/decline/edit; update score header live.  
Result: `POST /api/tailor/[id]/score` — auth, loads tailored row + job `extracted_data`, merges decisions via `buildApprovedResume`, scores with `calculateATSScore`; optional `persist: true` writes `match_score`/`tailored_score`. Helper `scoreTailoredWithDecisions` in `lib/scoring/tailored-rescore.ts`.  
Files changed: `app/api/tailor/[id]/score/route.ts`, `lib/scoring/tailored-rescore.ts`, `lib/scoring/__tests__/tailored-rescore.test.ts`

---

## Task 112 — Standalone resume builder (profile master + preview)
Status: DONE (partial — split view + live preview; Content Editor checkboxes deferred)  
Scope: `components/profile/*`, new builder route/view, `lib/export/pdf-generator.tsx` reuse  
Goal: Profile editors (existing) + right-pane `PDFViewer` rendering `profile_data` as a resume. Profile = master resume. Per DESIGN-TEAL-PARITY.md §A1. Content Editor–style include checkboxes for sections/bullets.  
Result: Teal-style split on Profile workspace — editors + sticky `ResumePreview` on lg+; collapsible preview on mobile. Reuses `profileDataToStructuredResume` from `lib/profile/data.ts`. `/dashboard/builder` redirects to profile. Save/provenance/GitHub unchanged.  
Files changed: `components/profile/ProfileWorkspace.tsx`, `app/dashboard/builder/page.tsx`

---

## Task 112b — Full Design Mode (Teal Designer parity, responsive)
Status: DONE  
Scope: `components/builder/designer/*`, `lib/export/theme.ts`, `lib/export/pdf-generator.tsx`, `components/resume/ResumePreview.tsx`, `components/profile/ProfileWorkspace.tsx`, migration 009  
Result: Full Designer UI (Presentation / Sections / Settings / Advanced) on Profile with Content Editor | Designer tabs. Live preview themed. Master theme saved to `profiles.resume_theme`. Migration 009 applied remotely. PDF + HTML preview honor section order, alignments, skills layout, experience/education settings, spacing. No template library — one HireIQ default + Reset. Responsive: stacked controls + collapsible preview on small screens.  
Files changed: `components/builder/designer/*`, `components/profile/ProfileWorkspace.tsx`, `components/resume/ResumePreview.tsx`, `lib/export/theme.ts`, `lib/export/pdf-generator.tsx`, `docs/supabase/migrations/009_resume_theme.sql` (applied)

---

## Task 118 — Nav + Applications/Tailor UI refresh
Status: DONE  
Scope: `components/shared/Sidebar.tsx`, `MobileNav.tsx`, `app/dashboard/page.tsx`, `app/dashboard/tailor/page.tsx`, `app/dashboard/jobs/page.tsx`  
Result: Primary nav now Applications · Documents · Tailor · Alerts (Documents = profile/resumes/designer, one click). Applications list restyled as clean tracker rows with status chips + Documents CTA. Tailor flow chrome aligned with Job Hub (clearer hierarchy, Documents shortcut, less purple card clutter).  
Files changed: `Sidebar.tsx`, `MobileNav.tsx`, `app/dashboard/page.tsx`, `app/dashboard/tailor/page.tsx`, `app/dashboard/jobs/page.tsx`

---

## Task 113 — Tracker Kanban + list toggle
Status: DONE  
Scope: new `components/jobs/TrackerBoard.tsx`, jobs list view, status PATCH → `application_events`  
Goal: Drag cards between status columns (counts per column); list/board toggle. Per DESIGN-TEAL-PARITY.md §B.  
Result: Applications home reads from `applications` join jobs. Table (default) | Board toggle. Native HTML5 drag between status columns; optimistic update via status API + event row. Empty state + Documents CTA unchanged.  
Files changed: `components/jobs/ApplicationsTracker.tsx`, `TrackerBoard.tsx`, `TrackerList.tsx`, `app/dashboard/page.tsx`

---

## Task 114 — Gmail read-only scan + status inference
Status: IN PROGRESS  
Scope: Gmail OAuth readonly, scan job, match to tracked applications, notifications, **opt-out pref (default on)**  
Goal: When Google is connected, scan/match employer emails to saved/applied jobs; high confidence auto-link, medium/low confirm. Extension Submit timestamps improve matching. Per 2026-08-12 DECISIONS lock.  
Notes: Not 100% accurate by design. Email/password users nudged to connect Google. Full mask/reply relay = v2 (see Task 139 + EMAIL.md).  
Blocked by: Google OAuth verification path for `gmail.readonly` in production; needs `GOOGLE_CLIENT_ID`/`SECRET` in env.  
Result (partial): Migrations **016/017** applied. Connect + opt-out + Sync now + cron batch + shared inbound linker. History API incremental still TODO (currently newer_than:14d list).  
Files changed: `016_gmail_sync.sql`, `017_inbound_provider.sql`, `lib/google/*`, `lib/email/link-inbound.ts`, `process-inbound.ts`, `app/api/google/*`, `app/api/cron/gmail-sync`, `GoogleConnectPanel.tsx`, docs

---

## Task 140 — v2 email mask reply-relay (document now)
Status: PENDING (v2)  
Scope: deepen Task 139 — apply with HireIQ address, inbound log, auto-forward, reply path (user → HireIQ → employer, HireIQ visible)  
Goal: Sprout-like tracking without Gmail read; optional for users who opt out of Gmail or use email/password only.  
Notes: Masked inbound create/forward already shipped (139). v2 = reliable reply routing + clearer prefs UX alongside Gmail opt-out.

---

## Task 115 — Forward-to-save email address
Status: PENDING (Phase 2)  
Scope: inbound email webhook (Edge Function), per-user address token, jobs pipeline reuse  
Goal: Forwarded posting → parsed → lands in tracker. Per DESIGN-TEAL-PARITY.md §C2.

---

## Task 142 — Extension panel IA: Autofill+progress + Questions (v0.9.5)
Status: DONE  
Scope: `extension/src/content.ts`, version bump, docs  
Goal: One Autofill Information section (profile + progress % + resume actions); Questions for ATS Q&A; no standalone Documents; Submit gated whenever resume upload exists.  
Result: Progress includes Resume PDF row; Generate/attach folded into Autofill; review retitled Questions; gate A (any resume field) replaces entry-level-only; v0.9.5.  
Files changed: `extension/src/content.ts`, `extension/package.json`, `extension/manifest.config.ts`, `docs/EXTENSION.md`, `docs/CHANGELOG.md`, `docs/STATUS.md`, `docs/TASKS.md`

---

## Task 116 — Chrome extension Phase 1: save-to-tracker
Status: DONE  
Scope: new `extension/` (MV3 + TS + CRXJS), token handshake from dashboard, `POST /api/jobs` token auth  
Goal: One-click save from any job page into the tracker. Per DESIGN-TEAL-PARITY.md §D.  
Result: `api_tokens` migration 012; hashed token handshake on Dashboard; `POST /api/jobs` Bearer auth + CORS; MV3 extension in `extension/` (scrape + save). Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.  
Files changed: `docs/supabase/migrations/012_api_tokens.sql`, `lib/supabase/admin.ts`, `lib/extension/tokens.ts`, `app/api/extension/token`, `app/api/jobs/route.ts`, `ExtensionConnectPanel`, `HomeTiles`, `extension/*`, `docs/EXTENSION.md`, AUTH, active docs  

---

## Task 117 — Extension Phases 2–3: autofill + review-queue auto-apply
Status: IN PROGRESS  
Scope: `extension/` board adapters (GH/Lever/Ashby/Workday + generic fallback), review queue UI  
Goal: Fill forms from profile + tailored PDF; user batch-reviews and submits while watching. Unknown fields ask the user every time (no answer bank). LinkedIn/Indeed excluded from automation. Per DESIGN-TEAL-PARITY.md §D.  
Notes: Phase 2 connect/ATS + autofill UX done. Phase 3 **user-watched Submit** shipped (v0.7.0). **v0.8–0.9.5** panel/save-first/choice review/panel IA. Board-specific adapters still optional polish.  
Result (partial): Website connect + ATS email + autofill UX + Submit + save-first + Questions + Autofill progress with resume gate. LinkedIn/Indeed submit click blocked.  
Files changed (v0.9.5): `extension/src/content.ts`, `extension/package.json`, `extension/manifest.config.ts`, `docs/EXTENSION.md`

---

## Task 138 — Extension v0.9: choice review + Documents + resume focus
Status: DONE  
Scope: extension review UX, documents merge, focus refresh  
Result: Select/radio/Yes-No pick buttons; No→N/A follow-ups; After save merged into Documents (Generate opens website); visibility/focus refreshes resumes + auto-selects newest. v0.9.0 CDP smoke pass.  
Files changed: `extension/src/{content,autofill}.ts`, `lib/extension/review-choices.ts`, tests, docs  

---

## Task 137 — Extension panel UX: save-first + compact + resume pick
Status: DONE  
Scope: `extension/src/content.ts`, version bump, related docs  
Result: Save-first gate via `by-url` lookup; Autofill/Submit disabled until saved; compact `<details>` profile + progress; accordion review; resume `<select>` + `tailoredResumeId` on PDF attach; scrape from `./scrape`; pageKind hint; v0.8.0. Verified CDP smoke (reload → 0.8 panel markers) + description unit tests.  
Files changed: `extension/src/content.ts`, `extension/package.json`, `extension/manifest.config.ts`, `lib/jobs/description.ts`, `docs/scripts/ext-v08-smoke.mjs`, `docs/EXTENSION.md`, `docs/CHANGELOG.md`, `docs/STATUS.md`  

## Task 136 — Extension resume list + PDF pick + form answers UI
Status: DONE  
Scope: extension job resumes/pdf APIs; applications answers API; JobDetailPage Activity  
Result: Bearer `GET /api/extension/jobs/[id]/resumes` lists tailored resumes; PDF route accepts `?tailoredResumeId=` and returns it in availability JSON; session `PATCH/DELETE /api/applications/[id]/answers`; `ApplicationAnswers` on Activity tab. `form_answers` loaded via applications `select('*')` on tracker detail.  
Files changed: `app/api/extension/jobs/[id]/{resumes,pdf}/route.ts`, `app/api/applications/[id]/answers/route.ts`, `lib/applications/form-answers.ts`, `components/jobs/detail/ApplicationAnswers.tsx`, `JobDetailPage.tsx`, `tracker/[jobId]/page.tsx`, accept route shared helper, tests, docs

---

## Task 119 — IA shell: Home tiles + nav + redirects
Status: DONE  
Scope: `Sidebar.tsx`, `MobileNav.tsx`, `app/dashboard/page.tsx`, new home component, route redirects for tailor/jobs  
Result: Home tiles; nav Home · Resume Builder · Job Tracker; Alerts in account menu; tailor + jobs/[id] redirect to tracker/matcher; builder is primary Resume Builder route.  
Files changed: `HomeTiles.tsx`, `Sidebar.tsx`, `MobileNav.tsx`, `app/dashboard/page.tsx`, `tracker/page.tsx`, `builder/page.tsx`, `profile/page.tsx`, `jobs/[id]/page.tsx`, `tailor/page.tsx`

---

## Task 120 — Status enum expansion (migration 011)
Status: DONE  
Result: Statuses expanded + backfill not_applied→bookmarked; inclusion + email_log + templates columns; jobs default bookmarked. Applied remotely.  
Files changed: `011_tracker_statuses_inclusion.sql`, `lib/jobs/status.ts`, `types/index.ts`, status API routes

---

## Task 121 — Tracker Teal table + Board polish
Status: DONE  
Result: Columnar Table default + Board with new statuses; filter chips; HireIQ theme.  
Files changed: `ApplicationsTracker.tsx`, `TrackerList.tsx`, `TrackerBoard.tsx`

---

## Task 122 — Job detail drawer
Status: DONE  
Result: Drawer with Job Info · Notes · Resumes · Email · Templates; Contacts/Check List disabled stubs; status radios.  
Files changed: `JobDrawer.tsx`, `app/api/applications/[id]/route.ts`

---

## Task 123 — Builder 5-tab chrome + inclusion checkboxes
Status: DONE  
Result: Content · Designer · Analyzer · Job Matcher · Cover Letter tabs; Job Matcher inclusion checkboxes persist to tailored_resumes.inclusion.  
Files changed: `ProfileWorkspace.tsx`, `AnalyzerPanel.tsx`, `JobMatcherPanel.tsx`, `CoverLetterPanel.tsx`

---

## Task 124 — Job Matcher replaces Tailor stepper
Status: DONE  
Result: Stepper routes redirect; Add Job CTAs open Job Matcher; drawer Resumes → Matcher.  
Files changed: tailor redirects, `jobs/page.tsx` CTA

---

## Task 125 — Content Editor + Matcher inclusion finish
Status: DONE  
Scope: `ContentEditor.tsx`, `inclusion.ts`, `ProfileWorkspace.tsx`, `JobMatcherPanel.tsx`  
Result: Teal Content Editor accordion + checkboxes wired as primary Content tab; session-only uncheck on master (preview only); Job Matcher split (left ContentEditor + right score/keywords/job preview) persists `tailored_resumes.inclusion`; `applyInclusion` filters preview/export shape.  
Files changed: `components/builder/ContentEditor.tsx`, `JobMatcherPanel.tsx`, `lib/profile/inclusion.ts`, `lib/profile/__tests__/inclusion.test.ts`, `components/profile/ProfileWorkspace.tsx`

---

## Task 126 — Applications: Teal tracker + full-page job detail
Status: DONE  
Scope: `app/dashboard/tracker/*`, `components/jobs/*`, nav/shell as needed; kill drawer as primary job UX  
Result: Click job → `/dashboard/tracker/[jobId]` full page with Overview · Job description · Documents · Questions · Notes · Email · Timeline; header status + score + actions. List/board unchanged. Drawer removed. Legacy `?jobId=` and `/jobs/[id]` redirect to full page.  
Files changed: `JobDetailPage.tsx`, `tracker/[jobId]/page.tsx`, `ApplicationsTracker.tsx`, `tracker/page.tsx`, `jobs/[id]/page.tsx`, `tailor/[id]/page.tsx`, deleted `JobDrawer.tsx`, `JobMatcherPanel.tsx`, `DESIGN-IA-RESET.md`  
Depends on: 2026-08-04 IA grill lock  

---

## Task 127 — Nav shell: Dashboard · Applications · Resume Builder; Profile via icon
Status: DONE  
Scope: `Sidebar`, `MobileNav`, `DashboardShell`, routes for profile vs builder  
Goal: Align primary nav with IA reset; Profile only from account/profile icon  
Result: Primary nav = Dashboard · Applications · Resume Builder; Profile only via account avatar (desktop + mobile). Shared `primary-nav.ts`. Profile hub at `/dashboard/profile` with Documents + Professional Profile stubs; `?section=` deep links still open Builder until Task 128.  
Files changed: `components/shared/{primary-nav.ts,Sidebar,MobileNav,DashboardShell}`, `HomeTiles.tsx`, `ProfileLanding.tsx`, `app/dashboard/profile/**`, `docs/scripts/ui-shots.mjs`, active docs  

---

## Task 128 — Profile: Documents + Professional Profile (Sprout)
Status: DONE  
Scope: profile routes/components; documents vault shared with resume library  
Goal: Master info + document storage; not Teal builder chrome  
Result: Real Sprout Profile at `/dashboard/profile` — Documents vault + Professional Profile editors (no Teal tabs/preview). Shared `useProfileSave`, `ProfileSectionNav`, `ProfileSectionPanel`, `loadProfileWorkspaceData`. `?section=` deep links route to Documents or Professional. Builder keeps Teal chrome via shared extract. Attachments moved under DOCUMENTS group.  
Files changed: `components/profile/{ProfessionalProfile,DocumentsVault,useProfileSave,ProfileSectionNav,ProfileSectionPanel,ProfileWorkspace,ProfileLanding}`, `lib/profile/{sections,load-workspace,resume-row}`, `app/dashboard/profile/**`, `app/dashboard/{builder,resume}/page.tsx`, ui-shots, active docs  

---

## Task 129 — Resume Builder library (Teal)
Status: DONE  
Scope: builder list/import/create; open resume to view/edit; Master → Profile  
Goal: Separate from Profile; same document set as Profile → Documents  
Result: `/dashboard/builder` is a Teal library (import, edit master, list resumes, past job versions). Master Teal workspace moved to `/dashboard/builder/master`. Legacy `?tab=` deep links redirect to master. Same `resumes` set as Profile Documents. Open resume → view + Open in editor → master.  
Files changed: `components/builder/ResumeLibrary.tsx`, `app/dashboard/builder/{page,master/page}.tsx`, `ProfileWorkspace.tsx`, TrackerList/Board, CoverLetterPanel, tailor/jobs redirects, resume detail, DocumentsVault copy, ui-shots, active docs  

---

## Task 130 — Tracker detail completion
Status: DONE  
Scope: `components/jobs/JobDetailPage.tsx`, `components/jobs/detail/*`, tracker application APIs/view models, fixed-job resume editor/preview, related tests and docs  
Goal: Complete the Sprout-style application detail UI with structured job content, documents editing, Activity, and a real-data manual inbox while preserving future email-provider boundaries.
Result: Rebuilt job detail as six focused tabs; compact structured JD; collapsible facts/activity rail; fixed-job two-pane resume editor with full live preview and canonical skill inclusion; combined notes/events timeline; provider-neutral manual inbox; authenticated manual event writes and email-linked events. No Gmail OAuth/schema migration.
Files changed: `components/jobs/JobDetailPage.tsx`, `components/jobs/detail/*`, `components/builder/ContentEditor.tsx`, `components/builder/JobMatcherPanel.tsx`, `components/resume/ResumePreview.tsx`, `lib/applications/{activity,email}.ts`, `lib/jobs/description.ts`, `lib/profile/{skills,inclusion}.ts`, `app/api/applications/[id]/*`, tracker routes, tests, `docs/scripts/ui-shots.mjs`, active docs

---

## Task 134 — Applications “All outreach” email list
Status: DONE  
Scope: `components/jobs/*`, `lib/applications/email.ts`, tracker page, docs  
Goal: Under Applications, toggle All applications | All outreach — global list of logged emails across jobs.  
Result: Surface tabs on Applications; `buildOutreachFeed` flattens `email_log`; OutreachList links to job Email tab; filters Sent/Received/Notes; `?view=outreach` deep link.  
Files changed: `outreach.ts`, `OutreachList.tsx`, `ApplicationsTracker.tsx`, `tracker/page.tsx`, email-activity tests, docs  

---

## Task 132 — Job resume editor: full-bleed + zoom/pan preview
Status: DONE  
Scope: `components/jobs/detail/*`, `components/builder/JobMatcherPanel.tsx`, `components/resume/ResumePreview.tsx`, JobDetailPage, docs  
Goal: Full-bleed Teal tabs on job Documents edit; preview zoom past 100% + pan/scroll left-right.  
Result: `JobResumeEditor` full-screen overlay with Teal tabs; Job Matcher `fullBleed` layout; ResumePreview zoom 40–175% + drag pan + left-align when zoomed.  
Files changed: `JobResumeEditor.tsx`, `DocumentsWorkspace.tsx`, `JobMatcherPanel.tsx`, `ResumePreview.tsx`, docs  

---

## Task 133 — Suggest for master + accept follow-up + provenance
Status: DONE  
Scope: `lib/profile/*`, `components/profile/*`, `app/api/profile/suggestions*`, tailor generate, QuestionsPanel, docs  
Goal: Explicit Suggest for master from Q&A; accept thin proposals via follow-up sheet (name + 1 bullet); muted From… provenance.  
Result: Tailor generate no longer auto-queues pending. Questions → Suggest for master queues section pending. Accept on thin items opens follow-up sheet; enrichment writes experience/project with provenance. Muted From… on bullets + entry cards.  
Files changed: `suggestion-followup.ts`, `provenance.ts`, `AcceptFollowUpSheet.tsx`, `PendingSuggestionsPanel.tsx`, `suggestions/route.ts`, `suggestions/suggest/route.ts`, `tailor/generate/route.ts`, `QuestionsPanel.tsx`, `JobDetailPage.tsx`, `primitives.tsx`, `sections.tsx`, `ProvenanceBulletEditor.tsx`, tests, docs  

---

## Task 131 — Profile unify (master resume home)
Status: DONE  
Scope: `components/profile/*`, `app/dashboard/profile/**`, `app/dashboard/builder/**`, links from tracker/builder/resume, docs  
Goal: One Profile page (docs + master + pending); retire `/builder/master` as master editor; redirects for legacy doors.  
Result: Unified `ProfileHome` at `/dashboard/profile` (identity → Documents tabs → pending banner → master editors). Legacy documents/professional/builder-master redirect. Builder library + tracker Match links updated. Dead hub components removed.  
Files changed: `ProfileHome.tsx`, `PendingSuggestionsPanel.tsx`, `ProfileSectionNav.tsx`, `sections.tsx`, `profile/**`, `builder/master`, `ResumeLibrary`, tracker/jobs/tailor/resume links, `JobDetailPage`, deleted ProfileLanding/DocumentsVault/ProfessionalProfile, docs  
Depends on: 2026-08-09 Profile IA grill  

---

## Task 130b — Tracker detail polish
Status: DONE  
Scope: tracker detail header, overview actions, facts rail, Activity, Email, description density  
Result: Reduced mobile header height with an inline status selector; made the full desktop facts rail hideable and restorable; combined the duplicate Notes/Activity action; capped formatted JD sections; changed Activity to newest-first; collapsed the manual email form by default.  
Files changed: `components/jobs/JobDetailPage.tsx`, `components/jobs/detail/{JobSummary,ActivityPanel,EmailInbox}.tsx`, `lib/jobs/description.ts`, `lib/jobs/__tests__/description.test.ts`, active docs

---

## Task 139 — Masked inbound email (Resend)
Status: DONE  
Scope: migration 015, `lib/email/*`, webhook + masked-email APIs, Profile Personal UI, env/docs  
Goal: Per-user `@mail.…` apply address; Resend `email.received` → `inbound_email_events` + matched job `email_log` / All outreach; optional forward.  
Result: Code + migration 015 applied (MCP). Domain `mail.kingsharif.com` receiving verified. Prod webhook `https://hireiq.kingsharif.com/api/webhooks/resend/inbound`. Vercel secrets set (no local TEST_USER). See [EMAIL.md](./EMAIL.md). Remaining: human smoke + optional `RESEND_FORWARD_FROM`; extension autofill of masked email; v2 reply-relay = Task 140.  
Files changed: `015_masked_inbound_email.sql`, `lib/email/*`, webhook + masked-email routes, `MaskedEmailCard.tsx`, docs  

---

## Task 141 — Production deploy (hireiq.kingsharif.com)
Status: DONE  
Scope: GitHub push, Vercel project `hireiq`, domain, env, docs  
Result: https://hireiq.kingsharif.com live (also hireiq-nu.vercel.app). Linked to `KingSharif1/HireIQ`. Production env: Supabase, Anthropic, GitHub OAuth, Resend, `MASKED_EMAIL_DOMAIN`, `NEXT_PUBLIC_APP_URL`. Removed TEST_USER_* and VERCEL_OIDC from Vercel.  
Files changed: `.vercelignore`, docs STATUS/EMAIL/CHANGELOG  

---

## Task 144 — Extension prod popup UX + connect domains
Status: DONE  
Scope: `extension/src/{popup,settings,env,auth}*`, `manifest.config.ts`, `ExtensionConnectPanel`, docs  
Goal: Production popup shows Connected / Not connected + Connect only (no localhost API field); local/dev keeps Advanced; `externally_connectable` includes `hireiq.kingsharif.com`.  
Result: v0.9.6 — `IS_DEV_BUILD` gates UI; prod forces `https://hireiq.kingsharif.com`; dashboard panel demotes legacy token. True zero-click background link not possible (Chrome); already-logged-in site + Connect = instant link.  
Files changed: `extension/src/popup.html`, `popup.ts`, `settings.ts`, `env.ts`, `auth.ts`, `manifest.config.ts`, `package.json`, `components/home/ExtensionConnectPanel.tsx`, docs  

---

## Task 145 — Document extension connect + Chrome Store prep
Status: DONE  
Scope: `docs/EXTENSION.md`, `docs/CHROME-STORE.md`, README, STATUS, DECISIONS, CHANGELOG  
Goal: Single place for connect mental model, local vs prod builds, Store checklist, trader note, publish gates.  
Result: EXTENSION.md rewritten; new CHROME-STORE.md; cross-links from README/STATUS.  
Files changed: `docs/EXTENSION.md`, `docs/CHROME-STORE.md`, `docs/README.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/TASKS.md`  

---

## Task 146 — Resume Builder UX: one coherent surface
Status: PENDING  
Scope: `components/builder/**`, `components/profile/**`, `app/dashboard/{builder,profile,resume}/**`, `components/shared/primary-nav.ts` (+ Sidebar/MobileNav), docs; **avoid** Applications/Job Hub unless redirects  
Goal: Resume Builder looks and acts like one product page — fewer hops/tabs/duplicate doors (library vs Profile section carousel vs upload). Applications stay as-is.  
Notes: Prior lock (DECISIONS 2026-08-09) split Profile=master / Builder=library / Teal=job Documents. User now wants consolidation. **Grill IA first**, then implement. Brief: [RESUME-BUILDER.md](./RESUME-BUILDER.md).  
Result:  
Files changed:  

---

## Task 143 — Enable Supabase Google login (site + extension)
Status: IN PROGRESS  
Scope: `proxy.ts`, `lib/auth/messages.ts`, auth pages, `docs/AUTH.md`, extension auth error copy  
Goal: Users can sign in with Google on `/login` and `/signup`; extension via Connect HireIQ (Google or email) once provider is on.  
Result (code): Stale refresh-token cookie clear in proxy; friendlier `google_not_enabled` errors; AUTH checklist with exact redirect URIs. **Blocked on human:** enable Google provider in Supabase + Google Cloud OAuth client (see AUTH.md §3). Verified live: authorize returns `provider is not enabled`.  
Files changed: `proxy.ts`, `lib/auth/messages.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `extension/src/auth.ts`, `docs/AUTH.md`, STATUS/CHANGELOG/TASKS  

---

## Task 135 — Job description quality (extension save + UI)
Status: DONE  
Scope: `app/api/jobs/route.ts`, `lib/jobs/description.ts`, `components/jobs/detail/JobSummary.tsx`, description tests, docs  
Goal: Stop saving glued ATS chrome as JD; enrich Greenhouse/Lever/Ashby/Workday saves via scraper; readable summary + paragraph full posting.  
Result: POST `/api/jobs` normalizes `apply_url`, scrapes ATS hosts when body text is weak, rebuilds `extracted_data.summary`/responsibilities from cleaned paragraphs; existing glued “Back to jobs” rows can be improved once. `stripAtsChrome` + paragraph-preserving normalize; JobSummary hides empty Requirements/Keywords and renders full posting as `\n\n` paragraphs.  
Files changed: `app/api/jobs/route.ts`, `lib/jobs/description.ts`, `lib/jobs/__tests__/description.test.ts`, `components/jobs/detail/JobSummary.tsx`, active docs

---

## Task 147 — Extension agentic apply spec (doc only)
Status: DONE  
Scope: `docs/EXTENSION.md`, `docs/DECISIONS.md`, `docs/TASKS.md`  
Goal: Document v2 agentic apply — multi-step navigation, account creation + OTP tied to `email_tracking_mode` (`gmail` | `masked` | `off`), login override/timeline for masked, autofill-only when off. No code.  
Result: Added EXTENSION.md § Agentic apply (planned); DECISIONS 2026-08-13 intent lock; panel table updated. Implementation blocked on Gmail sync + masked inbound OTP.  
Files changed: `docs/EXTENSION.md`, `docs/DECISIONS.md`, `docs/TASKS.md`

---

## Backlog (Phase 2+)

- **Extension agentic apply** — implement Task 147 spec (navigation, signup by tracking mode, OTP from Gmail or masked inbound)
- Extension: masked email autofill on apply forms
- Task 140 — mask reply-relay prefs + reply path
- Master update soft-keep (24h enrichments) + classify existing vs new
- Contacts + Check List on job detail (real)
- Fit score on application cards
- Playwright fallback for generic job URLs
- OCR for scanned PDFs
- People / Companies tracker tabs
- Resume parse: tiered skills + low-confidence flags
