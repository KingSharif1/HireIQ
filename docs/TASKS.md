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

## Task 171 — TailorDiff clarity (what/why + expand + edit score impact)
Status: DONE
Owner: this session
Scope: `components/tailor/TailorDiff.tsx`, `components/jobs/detail/AiTailorFlow.tsx`, `lib/scoring/tailored-rescore.ts` (+ test), `docs/TAILOR-EDIT.md`, TASKS/CHANGELOG/STATUS
Avoid: GitHub, execute-run prompts, Profile hub
Goal: Each change card shows plain what/why; details (before/after) in a dropdown; after edit/accept, show live score delta for that change and how it affects match.
Result: Cards show section + action + Why + preview + ± match pts; expand for before/after and keyword/skill impact; edit save recalculates via `scoreImpactForChange` + live ATS on decisions.
Files changed: `TailorDiff.tsx`, `AiTailorFlow.tsx`, `lib/scoring/tailored-rescore.ts`, `tailored-rescore.test.ts`, TAILOR-EDIT, TASKS, CHANGELOG, STATUS

---

## Task 170 — Tailor review UI (preview-majority + independent scroll)
Status: DONE
Owner: parallel lane C (review UI)
Parallel: Safe vs **168** and **169** — owns only tailor review chrome
Scope: `components/jobs/detail/AiTailorFlow.tsx`, `components/tailor/TailorDiff.tsx`, `components/tailor/MatchScore.tsx` (layout only if needed), wire `ResumePreview` `highlights` via `lib/tailor/change-copy.ts` (read-only reuse), tests if any, `docs/TAILOR-EDIT.md` review section only
Avoid: `lib/github/**`, `lib/tailor/execute-run.ts`, prompts, job scraper, provenance suppress, Profile UI
Goal: Desktop review: resume preview ~65–80% width, sticky/viewport height; left score+suggestions scroll independently. Hover/focus a change → highlight on preview. Live preview from decisions. Accepted/declined/edited collapse chrome (Undo + primary remaining actions). Decline = one tap; optional why later or drop. Icon buttons need accessible names.
Result: Review overlay is viewport-height flex (`min-h-0` + `overflow-hidden`); left ~30% scrolls independently; right ~70% sticky live preview with hover/focus highlights via `highlightsFromChanges`. TailorDiff: one-tap decline, collapsed post-decision chrome (status + Undo; accepted keeps Decline/Edit), `aria-label` on icon buttons. MatchScore untouched.
Files changed: `components/jobs/detail/AiTailorFlow.tsx`, `components/tailor/TailorDiff.tsx`, `docs/TAILOR-EDIT.md`, `docs/TASKS.md`, `docs/CHANGELOG.md`

---

## Task 169 — GitHub evidence library (enrich via suggestions + deny forever)
Status: DONE
Owner: parallel lane B (GitHub)
Parallel: Safe vs **168** (tailor) and **170** (review UI)
Scope: `lib/github/{suggestions,sync,scan-project,repo-quality,resume-bullet}.ts`, `lib/profile/provenance.ts` (decline → suppress), `lib/profile/data.ts` normalize if needed, `types/index.ts` **only** additive `dismissedSuggestionIds` (or equivalent) on ProfileData — do not rewrite job/tailor types, Profile pending UI if required for suppress, tests, `docs/GITHUB.md` / PROFILE-MASTER GitHub blurb
Avoid: `lib/tailor/execute-run.ts`, `lib/ai/prompts.ts`, `AiTailorFlow`, `TailorDiff`, job scraper
Goal: On sync/analyze of **linked** repos, propose tools + bullets as **pending suggestions only (Option A)** — never silent-write master. Soft matches still ask to link. Declined GitHub suggestions never reappear. Archived stay out of discovery.
Result: Linked repos emit `gh-{id}-bullet` / `gh-{id}-tool-*` pending suggestions (never silent master writes). `declineSuggestion` persists ids in `dismissedSuggestionIds`; generation + merge filter them. Soft name-match still skips new cards; high-confidence URL auto-link unchanged; archived stay out of discovery. Accept of tool tags lands on project.technologies.
Files changed: `lib/github/suggestions.ts`, `lib/github/scan-project.ts`, `lib/profile/provenance.ts`, `lib/profile/data.ts`, `types/index.ts`, github/provenance tests, `docs/GITHUB.md`, `docs/PROFILE-MASTER.md`, TASKS, CHANGELOG
See: DECISIONS 2026-09-18 · [GITHUB.md](./GITHUB.md)

---

## Task 168 — Claude-quality tailor (thesis + project pick + skill honesty)
Status: DONE
Owner: parallel lane A (tailor quality)
Parallel: Safe vs **169** and **170**
Scope: `lib/tailor/job-relevance.ts`, `lib/tailor/execute-run.ts`, `lib/ai/prompts.ts`, leftover-chip filter in tailor continue/execute, `lib/jobs/job-scraper.ts` (+ Oracle/generic thickness), job analyze path for `role_thesis` / domain tags if additive on `JobExtractedData` in `types/index.ts` **only** those fields, tests, `docs/TAILOR-QUALITY.md`
Avoid: `lib/github/**`, `lib/profile/provenance.ts`, `AiTailorFlow`, `TailorDiff`, Profile UI
Goal: Close the Emerson bake-off gap vs Claude — thick JD, domain-aware project ranking, don’t promote coursework skills as proficiency, concrete chips only. Stay ≤2 Claude calls.
Result: Domain/thesis ranking elevates hardware (Mapping Robot) over web when JD is sparse/embedded; analyze prompt + types add `role_thesis`/`domain_tags`; tailor prompt blocks coursework≠proficiency; leftover chips filter vague terms; Oracle/generic scrape thicker (16k + Playwright retry). Still ≤2 Claude calls (no new model pass).
Files changed: `lib/tailor/job-relevance.ts`, `lib/tailor/execute-run.ts`, `lib/tailor/ats-gap-hints.ts`, `lib/ai/prompts.ts`, `lib/jobs/job-scraper.ts`, `lib/jobs/fetch-types.ts`, `lib/jobs/fetch-rules.ts`, `lib/jobs/extractors/html-heuristic.ts`, `lib/jobs/normalize-job.ts`, `types/index.ts`, tests, `docs/TAILOR-QUALITY.md`, TASKS, CHANGELOG
See: [TAILOR-QUALITY.md](./TAILOR-QUALITY.md)

---

## Task 167 — Job detail application UX + model defaults
Status: DONE
Owner: this session (job tracker / apply surface)
Parallel: Safe alongside **162** — no tailor-pipeline or Profile-suggestion files.
Scope: `lib/jobs/description.ts`, `lib/ai/models.ts`, `components/jobs/JobDetailPage.tsx`, `components/jobs/detail/{ApplicationAnswers,EmailInbox,JobSummary,AutoApplyWithHireIQ,QuestionsPanel}.tsx`, `app/dashboard/tracker/[jobId]/page.tsx`, tests, docs
Goal: Fix glued ATS description bullets; remove duplicate Application answers on Activity; clarify Q&A vs form answers; email provenance (Gmail sync / masked / forwarded); honest Auto-apply when Cloud Run worker unset; default strong model → Sonnet 5 (Haiku stays fast).
Result: Description quality gate rejects chrome mega-blobs; Activity no longer repeats form answers; Q&A = Tailor gaps + Form answers; Email badges name sync/masked/forward paths; Auto-apply CTA shows setup-needed when `APPLY_WORKER_*` missing; `AI_MODELS.strong` = `claude-sonnet-5`.
Files changed: `lib/jobs/description.ts` + test, `lib/ai/models.ts`, `JobDetailPage.tsx`, `ApplicationAnswers.tsx`, `EmailInbox.tsx`, `JobSummary.tsx`, `AutoApplyWithHireIQ.tsx`, `QuestionsPanel.tsx`, `tracker/[jobId]/page.tsx`, STATUS/CHANGELOG/DECISIONS/TASKS/AUTO-APPLY

---

## Task 165 — Profile documents vault (Resumes + Additional Documents)
Status: DONE
Owner: documents session. Shared Profile files reconciled with Task 164.
Scope: `lib/profile/{sections,documents,data,provenance,resume-row,load-workspace,extra-document-store}.ts`, `components/profile/{ResumesSection,AdditionalDocumentsSection,MasterExportPanel,ProvenanceBulletEditor,primitives}.tsx`, `app/api/resume/[id]/file`, `app/api/profile/documents/**`, `types/index.ts`, tests, docs
Goal: Profile rail has one document home for resumes and one for extra docs. Original PDF in-pane; master export on Resumes only; fold attachments into Additional Documents; later: PDF/DOCX upload for extras.
Result: Canonical write-up: [PROFILE-MASTER.md](./PROFILE-MASTER.md). Rail = Resumes + Additional Documents. Original via authenticated file route + blob preview. Export PDF on card → large dialog with zoomable live page. Extra docs: links and/or PDF/DOCX in `{userId}/docs/`. Auto-grow textareas. Combined GitHub hub with ask-before-duplicate / profile-README → portfolio link. Playwright: `npm run ui:profile-docs:headed`.
Files changed: documents/export/GitHub hub polish across profile + `lib/github/{scan-project,repo-quality,suggestions,sync}.ts`, `ResumePreview` fitAxis, `docs/PROFILE-MASTER.md`, STATUS/CHANGELOG/DECISIONS

---

## Task 166 — Suggestion quality (dedupe + attribution + routing)
Status: DONE
Owner: this session (Profile suggestions lane)
Parallel: Ran alongside **162** (tailor) — no shared runtime imports; soft share docs only.
Scope: `lib/profile/{suggestion-dedupe,provenance,route-gap-answer}`, `components/profile/PendingSuggestionsPanel.tsx`, `app/api/profile/suggestions/suggest`, `lib/github/sync.ts`, tests, docs
Goal: Before offering or accepting a suggestion, skip bullets/skills/entries that already exist. Show who changed a fact (you vs AI/GitHub) and when. Stop dumping invented or other-job text onto the wrong experience (Harper example).
Result: Added `suggestion-dedupe` — content/near-dup filter on write-back + GitHub merge; accept no-ops duplicates; retargets misrouted company/project mentions (Harper text → Harper role). Attribution: `From AI · …` / `From GitHub · …` / `You · edited {date}` + clearer timeline. Pending cards show source + date.
Files changed: `lib/profile/suggestion-dedupe.ts`, `provenance.ts`, `__tests__/suggestion-dedupe.test.ts`, `PendingSuggestionsPanel.tsx`, `suggest/route.ts`, `lib/github/sync.ts`, docs


---

## Task 163 — Profile master hub + contextual updates
Status: DONE
Scope: `components/profile/**`, `lib/profile/**`, `app/api/profile/suggestions/route.ts`, docs
Goal: Keep Profile simple and Sprout-like: one section at a time, a tablet/desktop side menu that can collapse, visible application information inside Personal Info, and master suggestions shown at the exact entry they update. Accepted updates briefly highlight in place; new-entry proposals stay at the top of their section.
Result: Profile side navigation now appears from tablet width and collapses to an accessible icon rail; phones retain the drawer. Application Information is always visible inside Personal Info; work eligibility uses selects, salary range and date of birth are reusable fields, and demographic values use canonical dropdowns. Existing-entry proposals render in their target card; new proposals lead the section. Accept responses identify the resulting entry/bullet so the UI opens, scrolls, and highlights it. New entries prepend.
Files changed: `ProfileHome.tsx`, `ProfileSectionNav.tsx`, `ProfileSectionPanel.tsx`, `sections.tsx`, `PendingSuggestionsPanel.tsx`, `ProvenanceBulletEditor.tsx`, `primitives.tsx`, `useProfileSave.ts`, `types/index.ts`, `lib/profile/{sections,provenance,suggestion-focus,apply-answers}.ts`, `lib/extension/autofill-context.ts`, suggestion API, profile/extension tests, active docs

---

## Task 164 — GitHub repository intelligence
Status: DONE
Scope: `lib/github/**`, GitHub sync/scan APIs, Profile Projects UI, additive migration, tailor context, tests, docs
Goal: Replace shallow README/root-path snapshots with persistent project intelligence keyed by repository commit SHA. Use the existing GitHub OAuth token with the recursive Trees API plus selective manifest/docs/config/source blobs; summarize architecture, tools, features, key files, and resume-safe evidence. Deep-scan linked or job-relevant repositories, not every repository on every tailor. Gitingest/Repomix are references or worker fallbacks, not a Python dependency in Next.js.
Result: Bounded Trees/blob collection, fast-model analysis, per-commit cache (migration 024), Profile analyze UI, tailor context. Profile hub polish: one GitHub panel; `planRepoAdd` asks before duplicating; profile README repos suggest portfolio link. Live OAuth reconnect smoke still a user follow-up. Canonical Profile UX: [PROFILE-MASTER.md](./PROFILE-MASTER.md).
Files changed: `lib/github/**`, intelligence API, Profile GitHub UI, migration 024, tests, docs + shared Profile reconciliation with 165

---

## Task 162 — Draft-first tailor + optional real-gap chips
Status: DONE
Owner: this session (tailor lane)
Scope: `lib/tailor/*`, `lib/ai/prompts.ts`, `app/api/tailor/runs/**`, `components/jobs/detail/AiTailorFlow.tsx`, docs
Goal: Create a complete first draft from Profile + GitHub + JD immediately. Ask only after the draft, and only about real leftover gaps (0–2 optional chips). Skip = leave it off.
Lock: **Option A** — draft first; never block the first draft on questions.
Result: `executeGapPhase` skips Claude quiz → generate immediately. After draft, ≤2 leftover chips on the run; review UI shows optional tips; skip clears without AI; material answers → one weave via `claimWeavePhase` (2-call ceiling). Prompt adds thesis + projects-first when JD values portfolio. Theme uses `themeOverrideForJob`. Legacy `awaiting_answers` still continues. Red Hawk live smoke waived by user.
Files changed: `execute-run.ts`, `runs.ts`, `run-types.ts`, `continue/route.ts`, `AiTailorFlow.tsx`, `prompts.ts`, tailor tests, STATUS/TASKS/CHANGELOG/TAILOR-EDIT/DECISIONS


---

## Task 161 — Scan OCR parse + 10MB + mobile profile nav
Status: DONE  
Scope: `lib/resume/extract-text.ts`, parse route, `complete.ts`, ResumeUploader, ProfileSectionNav, ProfileHome, docs  
Goal: Scanned/image PDFs parse via Claude PDF vision; 10MB limit; mobile collapsible section drawer.  
Result: Vision OCR fallback when text layer &lt; 50 chars; upload max 10MB; mobile Profile sections collapse/expand densely.  
Files changed: extract-text, parse/route, complete, prompts, ResumeUploader, ProfileSectionNav, ProfileHome, tests, docs  

---

## Task 160 — GitHub OAuth/sync harden + parse polish
Status: DONE  
Scope: `normalizeProfileData`, GitHub oauth/callback/sync UI, resume parse prompt, docs/GITHUB.md  
Goal: New accounts can connect+sync GitHub; clearer callback URL error; better resume parse extraction.  
Result: Sparse profile no longer crashes sync; OAuth error shows exact callback URL; soft-fail sync after connect; parse uses categorized skills + polish.  
Files changed: provenance, oauth, callback, GitHubConnectPanel, resume-bullet, suggestions, prompts, parse/route, docs  

---

## Task 159 — Pro export + smarter Claude-quality tailor
Status: DONE  
Scope: `lib/export/*`, `MasterExportPanel`, profile panel, `ResumePreview`, `prompts.ts`, tailor pipeline/execute-run, `markdown.ts`, docs  
Goal: Master export with section/order; PDF/preview match Claude-quality polish; tailor curates to true one-pager using full profile data.  
Result: Master Export PDF panel; categorized skills + education polish + skill dedupe on PDF/preview/DOCX; stricter early-career length budget; Claude-style skill labels in MD codec; compact theme_override on tailor save.  
Files changed: format.ts, theme.ts, pdf-generator, docx-generator, MasterExportPanel, ProfileSectionPanel/Home/Workspace, ResumePreview, prompts, tailor-pipeline, execute-run, markdown, tests, docs  

---

## Task 158 — Tailor markdown wire + stream progress
Status: DONE  
Scope: `lib/resume/markdown.ts`, `lib/ai/*`, `lib/tailor/*`, `AiTailorFlow.tsx`, docs  
Goal: Reliable lightweight rewrite (MD not JSON) + live progress via streaming.  
Result: Codec + prompt + pipeline MD I/O; `streamAiTextToCompletion` with throttled process_log; generate UI shows live detail. Storage stays StructuredResume.  
Files changed: markdown codec, prompts, tailor-pipeline, complete, execute-run, AiTailorFlow, tests, DECISIONS/CHANGELOG/TASKS/STATUS  

---

## Task 157 — Auto-apply on easy forms + reusable application answers
Status: DONE  
Scope: `lib/apply/ease.ts`, job fetch/save, job detail CTA, `lib/profile/apply-answers.ts`, Profile Application form, form_answers APIs  
Goal: Show hosted Auto-apply for public forms (GH/Lever/Ashby **or** a simple resume form). Hide it for account portals (Workday, LinkedIn, login walls). Save apply Q&A on Profile for reuse.  
Result: URL + HTML classifier stores `extracted_data.apply_ease`. CTA + queue honor it. Profile → Application form holds work-auth / EEO / saved questions. Job Questions tab edits per-job answers and copies lasting ones to Profile.  
Files changed: `ease.ts`, job-scraper, save-from-url, analyze, JobDetailPage, queue, profile sections, answers APIs, tests, docs  

---

## Task 156 — Tailor UX: calm wait, durable errors, human voice
Status: DONE  
Scope: `components/jobs/detail/AiTailorFlow.tsx`, `components/ai/AiFlowLoader.tsx`, `lib/ai/{parse-json,prompts,tailor-pipeline,error-response}.ts`, `lib/tailor/{execute-run,runs,user-error,run-types}.ts`, `app/api/tailor/runs/route.ts`  
Goal: Failed tailor shows a clear error + retry (not a spinning Claude checklist). Refresh attaches to in-flight runs and still shows failures. Repair/parse model JSON. Copy never says “Claude call”. Rewrite stays in the user’s voice.  
Result: Loader is a short wait (“Reviewing this job” / “Writing a version in your voice”). Failed runs stay visible with Details + Try again. JSON from the rewrite is repaired when possible; remaining parse errors map to a human message. Prompt now requires their diction, not generic resume-speak.  
Files changed: `AiTailorFlow.tsx`, `AiFlowLoader.tsx`, `parse-json.ts`, `user-error.ts`, `execute-run.ts`, `runs.ts`, `runs/route.ts`, `prompts.ts`, `tailor-pipeline.ts`, tests, docs  

---

## Task 155 — Profile add UX + job folders + one source resume
Status: DONE  
Scope: `components/profile/**`, `components/builder/ResumeLibrary.tsx`, `lib/builder/group-tailored.ts`, `lib/profile/{focus-entry,parse-additions}.ts`, `app/api/resume/parse/route.ts`, `app/api/profile/merge-parse/route.ts`, `app/dashboard/resume/**`  
Goal: Searchable GitHub repo picker; add a project from GitHub; new entries prepend + scroll into view; Builder folders by job title/company with versions; job name links to tracker (no posting URL); one uploaded resume, replace asks before merging into master; drop broken original-upload / open-profile chrome on resume detail.  
Result: Native select replaced with searchable picker. Add from GitHub fills a project from last sync. New entries prepend and scroll into view. Harper v1/v2 share one folder; job title links to tracker. Replace updates the single source file and prompts before adding parse diffs to master.  
Files changed: `GitHubRepoPicker.tsx`, `GitHubAddProject.tsx`, `GitHubRepoField.tsx`, `sections.tsx`, `ResumeLibrary.tsx`, `group-tailored.ts`, `focus-entry.ts`, `parse-additions.ts`, `scan-project.ts`, parse + merge-parse APIs, resume upload/detail pages, tests, docs  

---

## Task 154 — Route Q&A to the right resume entry
Status: DONE  
Scope: `lib/profile/route-gap-answer.ts`, `lib/ai/tailor-engine.ts`, `lib/ai/prompts.ts`, `lib/ai/tailor-pipeline.ts`, `app/api/profile/suggestions/suggest/route.ts`, `lib/profile/provenance.ts`, `components/profile/ProvenanceBulletEditor.tsx`  
Goal: Gap answers become resume-language bullets (from the tailor rewrite, not the chat reply). IRC-style answers open a new job; NEMT-style answers land on that project — never dump onto Harper.  
Result: Routing matches project/company names; new employers get a follow-up with company prefilled; untargeted accept creates a new role instead of the first job. Empty bullets no longer show “From Harper”. No extra Claude call — uses the tailored rewrite when it fits.  
Files changed: `lib/profile/route-gap-answer.ts`, `lib/ai/{tailor-engine,prompts,tailor-pipeline}.ts`, `suggest/route.ts`, `provenance.ts`, `ProvenanceBulletEditor.tsx`, `sections.tsx`, types, tests, docs  

---

## Task 153 — Profile nav + section pages + GitHub repo picker
Status: DONE  
Scope: `components/shared/primary-nav.ts`, `components/profile/**`, `components/builder/**`, `app/dashboard/{profile,builder}/**`, `lib/github/**`, `lib/notifications.ts`, docs  
Goal: Profile is its own rail page (master + autofill identity). Left nav shows one section at a time. Project Repository is a GitHub repo picker (link, or optionally scan for highlights). Builder keeps tailored versions grouped by job.  
Result: Profile at `/dashboard/profile` (one section). Builder is files + tailored grouped by job. Repository dropdown of synced repos; optional highlight scan from last GitHub sync (no extra Claude). Existing projects no longer get README dumps on sync.  
Files changed: `primary-nav.ts`, `ProfileHome.tsx`, `GitHubRepoField.tsx`, `ResumeLibrary.tsx`, `BuilderHome.tsx`, profile/builder routes, `lib/github/{resume-bullet,scan-project,suggestions}.ts`, `lib/builder/group-tailored.ts`, docs  

---  

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
Status: IN PROGRESS  
Scope: `lib/export/pdf-generator.tsx`, `lib/resume/layout-check.ts`, export routes, Documents UI  
Goal: After tailor, run length + placeholder + section checks; surface flags in UI before export.  
Result (partial): `runResumeLayoutCheck` blocks PDF/DOCX on critical issues. Documents preview shows **Export check** + PDF/DOCX (disabled when critical). Multi-page warning via measured `pageCount`. Font-size heuristics warn when body is <9pt or >12pt, name >28pt, or line-height >1.65. Analyzer health checks remain separate.  
Files changed: `lib/resume/layout-check.ts`, `components/jobs/detail/{LayoutIssuesBanner,DocumentsWorkspace,JobResumeEditor}.tsx`, `lib/api/client.ts`

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
Result (partial): Migrations **016/017** applied. Connect + opt-out + Sync now + cron batch + shared inbound linker. **History API incremental** shipped 2026-08-13 (`listGmailHistoryChanges` + fallback full scan). Settings/Gmail panel show **incremental vs full scan** after Sync now, including stale-history fallback copy. Remaining: prod OAuth connect + second Sync now smoke.  
Files changed: `016_gmail_sync.sql`, `017_inbound_provider.sql`, `lib/google/*`, `lib/email/link-inbound.ts`, `process-inbound.ts`, `app/api/google/*`, `app/api/cron/gmail-sync`, `GoogleConnectPanel.tsx`, docs

---

## Task 152 — Better tailor + edit (questions, pen, mobile design, match highlights)
Status: DONE  
Scope: tailor prompts/pipeline, ContentEditor, JobResumeEditor, DesignerPanel, AnalyzerPanel, ResumePreview  
Goal: Weak 55% Apple tailor with 0 questions was not a finished resume. Ask when ATS has gaps; rewrite for ATS + human; let users edit real text; Design on mobile; Match shows real change descriptions on preview and in the edited section.  
Result: Shipped PR **#19**. ATS-fallback questions; one rewrite for interview odds; Content **Edit** button (mobile); Design Styling/Sections/Settings on phone; Match interview-odds brief + Accept-new-only; job-relevant inclusion from master. Doc: [TAILOR-EDIT.md](./TAILOR-EDIT.md).  
Files changed: see CHANGELOG 2026-08-15 Task 152; `docs/TAILOR-EDIT.md`

---

## Task 151 — Durable tailor run (one Claude session, survives refresh)
Status: DONE  
Scope: `tailor_runs` migration, `lib/tailor/{runs,execute-run,run-types}`, `/api/tailor/runs`, AiTailorFlow, tracker chips  
Goal: One tailor session per job. Refresh / leave / come back attaches to the same run. Never start a second Claude call while the first is running.  
Result: Context from DB (0 calls) → ATS gaps → optional 1 Claude questions → wait → 1 Claude rewrite. Unique index + CAS `gap_reserved` / `generate_reserved`. Tracker/job chips: Tailoring… / Needs your answers / Needs review.  
Files changed: `023_tailor_runs.sql`, `lib/tailor/*`, `app/api/tailor/runs/**`, `AiTailorFlow.tsx`, tracker + job detail, docs

---

## Task 150 — Never retry paid AI / auto-apply / autofill
Status: DONE  
Scope: `lib/ai/*`, AI API routes, auto-apply queue/UI, extension autofill, cover letter  
Goal: If a paid Claude call or auto-apply messes up, **stop**. Do not loop, critique-retry, or SDK-retry to “fix” it.  
Result: AI SDK `maxRetries: 0`; tailor pipeline 1 call; once-guards (429); **DB job lock** so Vercel remounts cannot fork-bomb; `router.refresh` removed from tailor complete. Deleted 132 Apple loop versions in prod. Auto-apply refuses re-queue after fail unless explicit new run.  
Files changed: `lib/ai/{complete,once,models,tailor-pipeline}.ts`, AI routes, `AutoApplyWithHireIQ.tsx`, `lib/apply/queue.ts`, `CoverLetterPanel.tsx`, docs

---

## Task 149 — BYOK AI key, model picker, usage/cost
Status: DONE  
Scope: Settings AI tab, `lib/ai/runtime`, usage events, migration 022  
Goal: User can use HireIQ Claude or their own Anthropic key; pick models; see tailor / cover / auto-apply counts and estimated $ per request.  
Result: Encrypted BYOK in `user_ai_secrets`; `ai_usage_events` on every Claude call + auto-apply queue; Settings → AI catalog + usage table; model hints on analyze/parse/cover.  
Files changed: `022_ai_byok_and_usage.sql`, `lib/ai/{models,runtime,complete,usage,error-response}.ts`, `lib/crypto/secret.ts`, `app/api/ai/*`, AI routes, `AiSettingsPanel.tsx`, `AiModelHint.tsx`, docs  

---

## Task 147 — Apply with HireIQ (extension handoff)
Status: PENDING  
Scope: website job CTA + extension handoff; reuse tailor + agentic apply  
Goal: From a tracked job, **Apply with extension** ensures tailored resume → opens ATS with extension agentic apply (user-watched / approval default).  
Notes: Hosted/server path is Task **148**. Pricing draft in PRICING.md (not implemented).  
Depends on: extension v0.9.9+, masked/Gmail tracking for OTP

---

## Task 148 — Hosted server auto-apply (Cloud Run)
Status: DONE (partial — code + migration live; Cloud Run deploy still ops)  
Scope: Playwright on **Cloud Run**, `apply_runs` queue, website **Auto-apply with HireIQ** CTA (web-first)  
Goal: Sprout-like unattended apply from the HireIQ site. Extension optional when already on ATS. Meter per PRICING.md when customers exist.  
Notes: Spec in [AUTO-APPLY.md](./AUTO-APPLY.md) · deploy [CLOUD-RUN-APPLY.md](./CLOUD-RUN-APPLY.md). Learnable board adapters on failure. CAPTCHA → `needs_user`. KVM not required as primary.  
Depends on: tailor PDF availability; shared board/OTP logic with extension  
Result: Migration **021** applied. Queue/status/worker APIs + Playwright fill (dry-run default) + live `result.progress`. Job detail CTA + animated progress panel. `services/apply-worker` Dockerfile. **Remaining ops:** deploy Cloud Run + `APPLY_WORKER_URL` / `APPLY_WORKER_SECRET` on Vercel.  
Files changed: `021_apply_runs.sql`, `lib/apply/*`, `app/api/apply/*`, `services/apply-worker/*`, `AutoApplyWithHireIQ.tsx`, `JobDetailPage.tsx`, `docs/CLOUD-RUN-APPLY.md`, docs  

---

## Task 140 — v2 email mask reply-relay (document now)
Status: DONE (partial — first slice live on main via PR #4)  
Scope: deepen Task 139 — apply with HireIQ address, inbound log, auto-forward, reply path (user → HireIQ → employer, HireIQ visible)  
Goal: Sprout-like tracking without Gmail read; optional for users who opt out of Gmail or use email/password only.  
Notes: Masked inbound create/forward already shipped (139). Remaining v2: All outreach unmatched reply; `RESEND_FORWARD_FROM`.  
Result: `POST /api/applications/[id]/email/reply`; Email tab **Reply via HireIQ**.  
Files changed: `lib/email/send-masked-reply.ts`, `app/api/applications/[id]/email/reply/route.ts`, `EmailInbox.tsx`, `JobDetailPage.tsx`, `MaskedEmailCard.tsx`, docs

---

## Task 115 — Forward-to-save email address
Status: DONE  
Scope: inbound webhook, `profiles.forward_save_email`, Settings UI, jobs pipeline reuse  
Goal: Forwarded posting → parsed URL → lands in tracker. Per DESIGN-TEAL-PARITY.md §C2.  
Result: Dedicated `save.{name}.{token}@mail.kingsharif.com` address. Resend inbound to that mailbox extracts a job URL (ATS preferred), `saveJobFromUrl` inserts/dedupes, notification links to the tracker. Settings → Integrations → **Save jobs by email**. Migration **020** applied.  
Files changed: `lib/email/{extract-job-urls,process-forward-save,process-inbound,masked-address}.ts`, `lib/jobs/save-from-url.ts`, `app/api/{jobs,profile/forward-save-email,webhooks/resend/inbound}`, `ForwardSaveCard.tsx`, `SettingsPanels.tsx`, migration 020, tests, docs

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
Result (partial): Website connect + ATS email + autofill UX + Submit + save-first + Questions + Autofill progress with resume gate. LinkedIn/Indeed submit click blocked. **v0.9.8:** Amazon/MS hosts. **v0.9.9:** board adapters for Greenhouse / Lever / Ashby / Workday (field maps + submit/continue/resume selectors); generic fallback for other hosts.  
Files changed (v0.9.9): `lib/extension/board.ts`, `form-fill.ts`, `extension/src/{autofill,detect,submit,file-attach}.ts`, `agentic-nav.ts`, tests

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
Status: DONE  
Scope: `components/builder/**`, `components/profile/**`, `app/dashboard/{builder,profile,resume}/**`, `components/shared/primary-nav.ts` (+ Sidebar/MobileNav), docs; **avoid** Applications/Job Hub unless redirects  
Goal: Resume Builder looks and acts like one product page — fewer hops/tabs/duplicate doors (library vs Profile section carousel vs upload). Applications stay as-is.  
Notes: Prior lock (DECISIONS 2026-08-09) split Profile=master / Builder=library / Teal=job Documents. User now wants consolidation. Brief: [RESUME-BUILDER.md](./RESUME-BUILDER.md).  
Result: One **Resume Builder** nav. Default **Master resume** (all sections on one scrolling page) + **Files & versions** with job-first View/Edit/Download. `/dashboard/profile` redirects. Job Documents: PDF-style view, Content/Design/Analyze editor, cover letter as its own document. Job detail: facts in header, Auto-apply + copy apply email, timeline-first Activity, tracked Email with Reply via HireIQ.  
Files changed: `ProfileHome.tsx`, `BuilderHome.tsx`, `ResumeLibrary.tsx`, `app/dashboard/builder/page.tsx`, `DocumentsWorkspace.tsx`, `JobResumeEditor.tsx`, `JobDetailPage.tsx`, `EmailInbox.tsx`, `ActivityPanel.tsx`, docs

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

## Task 147b — Extension agentic apply spec (doc only, historical)
Status: DONE  
Scope: `docs/EXTENSION.md`, `docs/DECISIONS.md`, `docs/TASKS.md`  
Goal: Document v2 agentic apply — multi-step navigation, account creation + OTP tied to `email_tracking_mode`.  
Result: EXTENSION.md agentic section shipped; implementation continues as Task **147** (extension CTA) + **148** (hosted worker).  
Files changed: `docs/EXTENSION.md`, `docs/DECISIONS.md`, `docs/TASKS.md`

---

## Backlog (Phase 2+)

- **Task 147 / 148** — extension handoff + hosted auto-apply ([AUTO-APPLY.md](./AUTO-APPLY.md))
- Stripe / usage meters per [PRICING.md](./PRICING.md)
- Master update soft-keep (24h enrichments) + classify existing vs new
- Contacts + Check List on job detail (real)
- Fit score on application cards
- OCR for scanned PDFs
- People / Companies tracker tabs
- Resume parse: tiered skills + low-confidence flags