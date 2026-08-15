## 2026-08-15 — Task 152b: Edit mode polish (live preview, mobile Edit, Match analysis)

**What:** Content Edit button always visible (esp. mobile); contact fields editable with live preview; Match explains interview odds + Accept only for **new** additions; Design on mobile = Styling / Sections / Settings; job-optimized inclusion keeps JD-relevant projects/skills from master.

**Files:** `EditableText.tsx`, `ContentEditor.tsx`, `AnalyzerPanel.tsx`, `DesignerPanel.tsx`, `JobResumeEditor.tsx`, `job-relevance.ts`, `optimization-brief.ts`, `change-copy.ts`, `change-decisions.ts`, prompts, tests, docs

**Why:** Prod still showed check-only editor; user wants hover/Edit, correlated highlights, accept-for-new-only, real Match analysis, ATS-focused projects.

**Next:** Merge PR #19 and smoke on phone + desktop.

---


**What:** Tailor now asks when ATS still has skill/keyword gaps (even if Claude returns 0 questions). The one rewrite targets both ATS parsers and a human recruiter while keeping the user’s voice. Job Edit: teal pen edits actual text (not just include/exclude), Design (section order + compact/standard/spacious) on mobile, Match tab shows real before/after + reason and highlights those lines on the preview and in the content section.

**Files:** `lib/ai/prompts.ts`, `tailor-pipeline.ts`, `tailor-engine.ts`, `ats-gap-hints.ts`, `change-copy.ts`, `execute-run.ts`, `ContentEditor.tsx`, `EditableText.tsx`, `AnalyzerPanel.tsx`, `DesignerPanel.tsx`, `JobResumeEditor.tsx`, `ResumePreview.tsx`, `theme.ts`

**Why:** Apple resume scored 55% with 6 changes and 0 gap answers — a weak fast rewrite, not an interview-ready tailor. User was right: checkboxes are not editing; Match was generic health, not “what changed.”

**Decisions:** Still max 2 Claude calls, no critique/retry. ATS-derived questions (max 3) if Claude asks nothing. Job editor writes the tailored snapshot only.

**Next:** Smoke a new Apple tailor after deploy; expect questions when skills are missing.

---
## 2026-08-14 — Durable tailor run (attach on refresh, max 2 Claude calls)

**What:** Tailor is now a background session (`tailor_runs`). Opening AI tailor attaches to the in-flight run instead of starting another. Flow: DB resume + JD → ATS compare → at most 1 Claude gap call → wait for answers → 1 Claude rewrite. Applications list/board and job detail show Tailoring… / Needs your answers / Needs review.

**Files:** `023_tailor_runs.sql`, `lib/tailor/{runs,execute-run,run-types}.ts`, `app/api/tailor/runs/**`, `AiTailorFlow.tsx`, tracker, `JobDetailPage.tsx`, `DocumentsWorkspace.tsx`

**Why:** Refresh and `router.refresh()` used to remount and burn a new Claude call (132 versions). User: keep the first one running even if they leave.

**Decisions:** Max 2 Claude calls, never overlapping, never retried. Stale busy runs fail after 3 minutes (after the 120s worker is gone) instead of starting a second paid call.

---


**What:** Deleted 132 Apple tailored versions (and their toasts) created in 8 minutes. Root cause: `router.refresh()` after each generate remounted the page and auto-started another Claude call. Removed that refresh. Added a Postgres job lock (`in_progress`) so overlapping serverless invokes cannot start a second paid call. sessionStorage blocks remount auto-start.

**Files:** `lib/ai/tailor-lock.ts`, `lib/tailor/auto-start.ts`, `app/api/tailor/generate/route.ts`, `JobDetailPage.tsx`, `AiTailorFlow.tsx`

**Why:** In-memory `Set` does not lock across Vercel lambdas. 273 tailor API calls / ~$10 estimated.

---

**What:** Hard stop after one attempt. The Vercel AI SDK default of **2 retries** (3 paid Claude calls) is now `maxRetries: 0`. Tailor is one rewrite, no critique loop. Overlapping tailor/gap/analyze/parse/autofill/cover-letter calls return 429. Auto-apply will not re-queue a failed/finished run unless the user explicitly starts a new billed run. If it fails, it stops.

**Files:** `lib/ai/{complete,once,models,tailor-pipeline}.ts`, AI API routes, `CoverLetterPanel.tsx`, `AutoApplyWithHireIQ.tsx`, `lib/apply/queue.ts`, `lib/apply/process-run.ts`, jobs page, extension autofill

**Why:** A React re-render loop plus SDK retries burned Anthropic credits. User rule: mess up → stop, don’t loop to “fix” it.

---
## 2026-08-14 — Kill tailor credit loop

**What:** Opening AI tailor re-fired Claude on every React re-render because `onComplete` was a new function each time. Guard: run once per screen, ignore overlapping clicks, skip critique loop in fast mode (1 Claude call), reject overlapping POSTs (429).

**Files:** `AiTailorFlow.tsx`, `lib/ai/tailor-pipeline.ts`, `app/api/tailor/generate/route.ts`

**Why:** That loop burned Anthropic credits. Fast tailor is now one rewrite, not a retry/critique loop.

---
## 2026-08-14 — Send full master resume to Claude (no 5k cut)

**What:** Tailor prompts now include the **entire** master resume + job JSON. Previously we sliced resume to 5,000 chars and JD to 2,000, so Claude never saw the whole profile.

**Files:** `lib/ai/tailor-engine.ts`, `lib/ai/tailor-pipeline.ts`, `app/api/tailor/{generate,questions}/route.ts`, `lib/profile/github-context.ts`

**Why:** User was right — context is already in the DB; we were chopping it before the only Claude call that matters.

---
## 2026-08-14 — Fix tailor crash: `.join` on missing Claude arrays

**What:** Claude drafts often omit `bullets` / `projects`. Pipeline now normalizes the JSON before diffing so we never call `.join` on undefined.

**Files:** `lib/ai/tailor-engine.ts`, `lib/ai/tailor-pipeline.ts`, `lib/scoring/ats-scorer.ts`

**Why:** Generate succeeded (4.7k chars) then crashed: `Cannot read properties of undefined (reading 'join')`.

---
## 2026-08-14 — Fast tailor path (skip gap-analysis API)

**What:** Default AI tailor now loads resume + job from DB instantly (`GET /api/tailor/context`), then one `/api/tailor/generate` call in **fastMode** (2 Claude calls). Skips the slow `/api/tailor/questions` gap-analysis step unless user chooses "Try gap questions (slower)".

**Files:** `app/api/tailor/context/route.ts`, `lib/tailor/ats-gap-hints.ts`, `AiTailorFlow.tsx`, tailor pipeline

**Why:** DB reads are milliseconds; 40s+ waits were Claude gap analysis + multi-pass critique, not fetching context.

---
## 2026-08-14 — Tailor process log (visible debugging)

**What:** AI tailor shows a live **Process log** — resume/job/GitHub loaded, Claude calls, pipeline passes, save — with timings. Failures show where it stopped.

**Files:** `lib/tailor/process-log.ts`, `components/tailor/TailorProcessLog.tsx`, `AiTailorFlow.tsx`, tailor API routes

**Why:** Hard to tell if tailoring was working behind the loader.

---
## 2026-08-14 — GitHub deep sync + tailor loader fixes

**What:** GitHub sync now reads README, root folder layout, and `package.json` tools before suggesting profile bullets. Empty/placeholder repos are skipped. AI tailor gap analysis and generate steps include GitHub project context. Tailor connect screen shows honest progress, long-wait hint, and 55s timeout with retry.

**Files:** `lib/github/{repo-enrichment,repo-quality,client,suggestions}.ts`, `lib/profile/github-context.ts`, `app/api/tailor/{questions,generate}/route.ts`, `lib/ai/{prompts,tailor-pipeline}.ts`, `components/jobs/detail/AiTailorFlow.tsx`, `lib/api/client.ts`, `docs/GITHUB.md`

**Why:** Users stuck on “Pulling job requirements” with no error; GitHub suggestions were generic language lists without README/code context.

**Next:** Re-sync GitHub on Profile/Builder so pending suggestions refresh with richer bullets.

---
## 2026-08-14 — Per-action Claude prices + historical backfill

**What:** Settings → AI shows $ per action (tailor / cover / analyze) for the selected models, and reconstructs past HireIQ Claude spend onto the testing account.

**Files:** `lib/ai/{models,usage,backfill-usage}.ts`, `AiSettingsPanel.tsx`, `app/api/ai/usage/route.ts`

**Why:** Price meant cost per user click, not a token dump; Anthropic Admin invoices aren’t available on a personal API key.

**Next:** Open Settings → AI after deploy.

---
## 2026-08-14 — Task 149: BYOK Claude + usage meters

**What:** Settings → AI lets you use HireIQ’s Anthropic key or your own, pick strong/fast models, and see tailored-resume / cover-letter / auto-apply counts plus estimated $ per API request.

**Files:** `022_ai_byok_and_usage.sql`, `lib/ai/*`, `lib/crypto/secret.ts`, `app/api/ai/{settings,usage}`, AI routes, `AiSettingsPanel.tsx`, `AiModelHint.tsx`

**Why:** Shared Claude credits ran out; users need a way to keep generating and to see what model is burning tokens.

**Next:** Paste a key or switch to Haiku if HireIQ credits are empty.

---
## 2026-08-14 — Cloud Run worker live + job document UX

**What:** Worker image installs Playwright (prod `npm ci` was skipping it), stubs `next-env.d.ts`, listens on `0.0.0.0`. Documents: Resume / Cover letter tabs, score why/improve chips, zoom/fit, note/event dialogs. Cloud Run `hireiq-505323` + Vercel `APPLY_WORKER_*`.

**Files:** `services/apply-worker/*`, `DocumentsWorkspace.tsx`, `ActivityPanel.tsx`, `AutoApplyWithHireIQ.tsx`, CLOUD-RUN-APPLY/STATUS

**Why:** Container failed Cloud Run health until Playwright was in the image; tablet UI hid score/edit below the resume.

**Next:** Smoke a dry-run apply on a real ATS job; Task 147.

---

## 2026-08-13 — Document viewer toolbar + score tips

**What:** Preview uses a top toolbar (score, Edit, PDF/DOCX, zoom/fit). Score opens a why/improve dropdown. Edit and cover letter open as full-screen overlays. Email reply sits at the top of the thread.

**Files:** `DocumentsWorkspace.tsx`, `ResumePreview.tsx`, `LayoutIssuesBanner.tsx`, `JobResumeEditor.tsx`, `EmailInbox.tsx`, `JobDetailPage.tsx`

**Why:** Tablet stacked the score rail under the resume; zoom was off; forms appeared below the fold.

**Next:** Deploy Cloud Run worker.

---

## 2026-08-13 — Job header + Builder files layout

**What:** Auto-apply progress is a dropdown overlay (doesn’t stretch the sticky job header). Files tab no longer repeats the Builder title.

**Files:** `AutoApplyWithHireIQ.tsx`, `JobDetailPage.tsx`, `BuilderHome.tsx`, `ResumeLibrary.tsx`

**Why:** After the merge, the header and Files page stacked too much chrome.

**Next:** Deploy Cloud Run worker; Task 147.

---

## 2026-08-13 — Merge desktop Task 146 polish into mobile main

**What:** Merged local Resume Builder / job-document polish into origin/main. Kept one Builder surface (Master + Files). Files tab has job-first View/Edit/Download. Job Documents keeps PDF view + Content/Design/Analyze editor + cover letter as its own document. Job detail keeps header facts, Auto-apply / copy apply email, timeline-first Activity, tracked Email with Reply via HireIQ (no manual log).

**Why:** Desktop and Cursor mobile diverged; this preserves both product directions without dropping auto-apply or Builder-as-master.

**Next:** Deploy Cloud Run worker; Task 147.

---

## 2026-08-13 — Task 148 merged: docs sync + cost table

**What:** Docs pass before merge — STATUS/TASKS/REMAINING/AUTO-APPLY/PRICING/Sprout research + Cloud Run vs VPS cost math in CLOUD-RUN-APPLY.

**Files:** docs/*

**Why:** Owner asked to commit, merge, and keep documents current.

**Next:** Deploy Cloud Run worker; Task 147.

---

## 2026-08-13 — Task 148: live apply progress UI + Cloud Run setup guide

**What:** Job detail progress panel (steps, % bar, filled-field chips with motion). Worker writes live `result.progress`. Step-by-step Cloud Run deploy doc.

**Files:** `AutoApplyWithHireIQ.tsx`, `lib/apply/{types,server-apply,process-run}.ts`, `docs/CLOUD-RUN-APPLY.md`, AUTO-APPLY

**Why:** Owner asked how to wire Cloud Run, Sprout parity honesty, and a visible apply process (status + motion vs live Chromium stream).

**Next:** Deploy worker; Task 147 extension CTA.

---

## 2026-08-13 — Task 148: hosted Auto-apply with HireIQ (queue + worker)

**What:** `apply_runs` queue (migration **021**), queue/status/worker APIs, Playwright fill engine (GH/Lever/Ashby-ish, dry-run default), job detail **Auto-apply with HireIQ** CTA, Cloud Run worker package under `services/apply-worker`.

**Files:** `docs/supabase/migrations/021_apply_runs.sql`, `lib/apply/*`, `app/api/apply/*`, `services/apply-worker/*`, `components/jobs/detail/AutoApplyWithHireIQ.tsx`, `JobDetailPage.tsx`, AUTO-APPLY/TASKS/STATUS/MIGRATIONS

**Why:** Start Task 148 before 147 — web-first Cloud Run apply path.

**Next:** Deploy worker to Cloud Run; set `APPLY_WORKER_URL` + `APPLY_WORKER_SECRET` on Vercel; then Task 147 extension handoff.

---

## 2026-08-13 — Cloud Run primary + web Auto-apply with HireIQ

**What:** Hosted apply locks to **Cloud Run** (not the $28 KVM as primary). Product UX: web **Auto-apply with HireIQ** queues the worker; extension helps when already on the ATS page. Documented honest coverage + learnable board adapters.

**Files:** `docs/AUTO-APPLY.md`, `DECISIONS.md`, TASKS/STATUS/REMAINING-WORK, sprout research lock blurb

**Why:** Cloud Run idle ≈ $0 and scales; KVM bills every month. Owner wants HireIQ-main auto-apply on web, not mobile-first.

**Next:** Implement Task 148 Cloud Run worker or Task 147 on-site extension CTA.

---

## 2026-08-13 — Dual auto-apply paths + draft pricing (docs)

**What:** Product lock for **extension + hosted** auto-apply. Pricing draft (docs only): tailor **2 for the price of 1** then extra; charge **server** auto-apply; extension autofill free (optional 10-then-pay). Infra note: prototype worker on **KVM**, Cloud Run for scale-to-zero later.

**Files:** `docs/PRICING.md`, `docs/AUTO-APPLY.md`, `DECISIONS.md`, `TASKS.md` (147/148), STATUS, REMAINING-WORK

**Why:** Owner wants Sprout-like server apply and a customer pricing sketch without implementing Stripe yet.

**Next:** Build Task 147 extension handoff; provision KVM when starting Task 148.

---

## 2026-08-13 — Sprout auto-apply research + Task 147 lock

**What:** Refreshed Sprout AI Apply / credits research. Locked HireIQ approach: **no application credits**; automation stays in the user’s Chrome extension; website CTA will chain tailor → agentic apply (Task 147).

**Files:** `docs/legacy/planning/12-sprout-research.md`, `DECISIONS.md`, `TASKS.md`, `STATUS.md`, `REMAINING-WORK.md`

**Why:** User wants Sprout-like “see job → tailor → AI applies” without weekly credit packs. Credits meter Sprout’s cloud browsers; HireIQ already has the cheaper path.

**Next:** Build Task 147 job-detail **Apply with HireIQ** handoff.

---

## 2026-08-13 — Task 140: reply via HireIQ application email

**What:** From a job’s Email tab, reply to an employer message and HireIQ sends it from your masked application address (Resend). The sent message lands in the same thread. Settings copy explains the reply path.

**Files:** `lib/email/send-masked-reply.ts`, `app/api/applications/[id]/email/reply/route.ts`, `EmailInbox.tsx`, `JobDetailPage.tsx`, `MaskedEmailCard.tsx`, tests, docs

**Why:** Task 140 first slice — Sprout-style reply without exposing personal Gmail. Needs `RESEND_API_KEY` and sending enabled on `mail.kingsharif.com`.

**Next:** Smoke a real reply on prod; optional inbound→forward copy (`RESEND_FORWARD_FROM`); thread linking for unmatched All outreach replies.

---

## 2026-08-13 — Task 115: save jobs by forwarding email

**What:** Each user can mint a `save.*@mail.kingsharif.com` address. Forward a posting there and the inbound webhook extracts a job URL, scrapes it, and adds it to Applications (deduped by apply URL). Settings → Integrations shows **Save jobs by email**. Extension autofill now uses the masked apply address when tracking mode is application email.

**Files:** `lib/email/{extract-job-urls,process-forward-save,process-inbound,masked-address}.ts`, `lib/jobs/save-from-url.ts`, `app/api/jobs/route.ts`, `app/api/profile/forward-save-email/route.ts`, `ForwardSaveCard.tsx`, `SettingsPanels.tsx`, `app/api/extension/profile/route.ts`, `lib/extension/apply-identity.ts`, `020_forward_save_email.sql`

**Why:** Spec Module 4 / Task 115. Also, masked tracking was on for the test user but Autofill still filled the Gmail address.

**Next:** Merge PR #3; reload extension v0.9.9 on the Aechelon Greenhouse form and confirm Email is the masked address; forward a Greenhouse URL to the new save address after deploy.

---

## 2026-08-13 — Copy apply email on job detail

**What:** When tracking mode is application email, job detail shows **Copy apply email** next to Apply, and the Email tab reminds you which address to use on the employer form. Prod smoke: test user already on masked mode with a live Greenhouse apply form.

**Files:** `JobDetailPage.tsx`, `EmailInbox.tsx`, `app/dashboard/tracker/[jobId]/page.tsx`

**Why:** Settings had the address; Apply opened Greenhouse without a way to copy it onto the Email field.

**Next:** Merge PR #3 so unmatched inbound appears in All outreach; reload extension v0.9.9 on a real apply form.

---

## 2026-08-13 — Extension board adapters (v0.9.9)

**What:** Greenhouse / Lever / Ashby / Workday field maps, submit/continue/resume selectors, and Lever/Ashby full-name fill. Generic fallback unchanged. Extension **v0.9.9**.

**Files:** `lib/extension/board.ts`, `lib/extension/form-fill.ts`, `extension/src/{autofill,detect,submit,file-attach}.ts`, `agentic-nav.ts`, tests, docs

**Why:** Task 117 remaining polish — generic classify missed ATS-specific names (`urls[LinkedIn]`, Workday `data-automation-id`, Ashby `_systemfield_*`).

**Next:** Merge PR #3; Gmail OAuth; more adapters when a host fails.

---

## 2026-08-13 — Master resume scrolls as one page

**What:** Resume Builder Master shows every profile section on one page. Left nav jumps to anchors; `?section=` deep links still work.

**Files:** `components/profile/{ProfileHome,ProfileSectionPanel}.tsx`, `lib/profile/sections.ts`, `BuilderHome.tsx`, docs

**Why:** Task 146 remaining carousel felt like many pages.

**Next:** Merge PR #3; Gmail OAuth.

---

## 2026-08-13 — Font-size export checks + Amazon/MS save hosts

**What:** Export check warns on body/name font size and loose line height. Extension + server job-URL gate allow `amazon.jobs` / `careers.microsoft.com` and block prod `hireiq.kingsharif.com`. Tracker empty-score CTA says Tailor. Profile/GitHub/suggestion links go to Resume Builder master (and keep `github_error` on redirect). Extension **v0.9.8**.

**Files:** `lib/resume/layout-check.ts`, `LayoutIssuesBanner.tsx`, `lib/extension/job-page.ts`, `extension/src/detect.ts`, `TrackerList.tsx`, `TrackerBoard.tsx`, `lib/notifications.ts`, GitHub OAuth callbacks, docs

**Why:** Close Task 106 font heuristics and leftover Profile doors after Builder consolidation.

**Next:** Merge PR #3; Task 146 optional scroll-all-sections; Gmail OAuth.

---

## 2026-08-13 — Unmatched inbound in All outreach

**What:** Application-address mail that doesn’t match a company still appears in All outreach (Unmatched). Prod webhook stored the inbound smoke message.

**Files:** `lib/applications/outreach.ts`, `ApplicationsTracker.tsx`, `OutreachList.tsx`, `app/dashboard/tracker/page.tsx`

**Why:** Smoke mail was received but hidden because All outreach only read job `email_log`.

**Next:** Merge PR #3; Gmail OAuth.

---

## 2026-08-13 — One Resume Builder nav + live page-count export check

**What:** Resume Builder is the only resume destination (Master + Files tabs). Profile URLs redirect. Documents export check uses measured preview page count. Gmail sync copy explains stale History API fallback.

**Files:** `components/builder/BuilderHome.tsx`, `app/dashboard/builder/page.tsx`, `app/dashboard/profile/page.tsx`, `primary-nav.ts`, `HomeTiles.tsx`, `ResumePreview.tsx`, `LayoutIssuesBanner.tsx`, `lib/google/sync.ts`, docs

**Why:** Continue remaining backlog after prod smoke; fewer hops for master resume edits.

**Next:** Merge PR #3; inbound test mail; Gmail OAuth.

---

## 2026-08-13 — Documents export check + remaining prod smoke

**What:** Documents preview shows layout issues and PDF/DOCX export (blocked on critical). Hide duplicate Portal login on Activity at desktop. Gmail Sync now copy includes incremental vs full scan. Prod: created application email; Amazon/Microsoft fetch-url returned titles; Gmail connect reaches Google OAuth.

**Files:** `components/jobs/detail/{LayoutIssuesBanner,DocumentsWorkspace,JobResumeEditor,ActivityPanel}.tsx`, `lib/resume/layout-check.ts`, `lib/api/client.ts`, `GoogleConnectPanel.tsx`, `SettingsPanels.tsx`, docs

**Why:** Close remaining smoke we can do without Google mailbox access; surface export QA in the live Documents UI.

**Next:** Send a test message to the application alias; finish Gmail OAuth; Task 146.

---

## 2026-08-13 — Prod smoke: portal login UI

**What:** Logged into production and verified Portal login on job tracker detail (facts rail + Activity tab): email, show/hide password, note. Gmail sync correctly returns 400 until connected. Masked inbound still needs an application alias.

**Files:** docs only (`STATUS.md`, `REMAINING-WORK.md`)

**Why:** Close the portal-login smoke that was blocked on credentials.

**Next:** Connect Gmail + create application email for remaining smokes.

---

## 2026-08-13 — Amazon/Microsoft fetch, portal login, Gmail history, export QA

**What:** Open Graph + Microsoft Eightfold PCSX job fetch; portal credentials on job detail (facts rail + Activity); Gmail History API incremental sync; resume layout check before PDF/DOCX export; Resume Builder library UX pass; `REMAINING-WORK.md` + migration 019 docs.

**Files:** `lib/jobs/extractors/{open-graph,microsoft-eightfold}.ts`, `lib/google/{gmail,sync}.ts`, `lib/resume/layout-check.ts`, `components/jobs/detail/{JobSummary,ActivityPanel}.tsx`, `components/builder/ResumeLibrary.tsx`, `app/api/export/{pdf,docx}/route.ts`, `docs/REMAINING-WORK.md`, `docs/supabase/MIGRATIONS.md`, live tests

**Why:** Close gaps from job-fetch + agentic apply MVP; ordered roadmap for remaining work.

**Next:** Merge PR #2, apply migration 019, human Google provider enable.

---

## 2026-08-12 — Handoff: Resume Builder next (Task 146)

**What:** Documented current Builder/Profile/job-Teal split, pain (too many pages/tabs), and Task 146 for a one-surface Resume Builder. Applications left alone.

**Files:** `docs/RESUME-BUILDER.md`, STATUS, TASKS, ARCHITECTURE, DECISIONS, CHANGELOG

**Why:** Clean new-chat start after marketing + dashboard ship.

**Next:** Grill IA → implement Task 146.

---

## 2026-08-12 — Task 145: Document extension connect + Chrome Store

**What:** Rewrote EXTENSION.md (connect mental model, local vs prod builds, externally_connectable, APIs). Added CHROME-STORE.md (trader, draft listing, publish gates, assets). Linked from README/STATUS; DECISIONS lock for prod popup.

**Files:** `docs/EXTENSION.md`, `docs/CHROME-STORE.md`, `docs/README.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/TASKS.md`

**Why:** Capture decisions before we leave Store setup and come back later.

**Next:** Icons + screenshots when ready to Publish; Task 143 Google enable.

---

## 2026-08-12 — Landing finale + CTA cleanup

**What:** Closing aurora finale (“Less paperwork. More interviews.”) with one primary Get started. Sign in only in footer. Interactive scroll scenes + parallax BG; removed sticky empty void.

**Files:** `components/marketing/{LandingPage,ProductScrollStory,ScrollParallaxBackground}.tsx`

**Why:** Bottom felt flat; too many Sign in / Get started duplicates.

**Next:** Google branding re-verify; optional Job Hub / Builder UI pass.

---

## 2026-08-12 — Task 144: Extension prod popup + connect domains

**What:** Production builds (`npm run build`) hide API URL + Advanced; show Connected / Not connected + Connect. Dev builds keep localhost + legacy. Force prod API host; add `hireiq.kingsharif.com` to `externally_connectable`. Dashboard Chrome extension card demotes legacy token.

**Files:** `extension/src/{popup.html,popup.ts,settings.ts,env.ts,auth.ts}`, `manifest.config.ts`, `ExtensionConnectPanel.tsx`, docs

**Why:** Store users should not see localhost controls; Connect while already signed in on HireIQ still links in one click (Chrome blocks silent zero-click link).

**Next:** Reload unpacked (dev) or build Store zip; smoke Connect on prod domain.

---

## 2026-08-12 — Dashboard shell + home visual refresh

**What:** Primary tokens → logo teal. Ink sidebar/mobile nav with logo + teal active states. Home greeting + intentional action tiles; polished extension panel. Applications header lightly aligned.

**Files:** `app/globals.css`, `components/shared/{DashboardShell,Sidebar,MobileNav}.tsx`, `components/home/*`, `app/dashboard/page.tsx`, `components/jobs/ApplicationsTracker.tsx`

**Why:** Match marketing quality inside the product, not only on the landing page.

**Next:** Optional deeper Job Hub / Builder pass.

---

## 2026-08-12 — Cinematic landing: tailor + extension scroll story

**What:** Hero with architectural grid + HireIQ-first thesis; sticky scrollytelling demos (tailor workbench → Chrome autofill → tracker). Stronger purpose copy for Google branding.

**Files:** `components/marketing/LandingPage.tsx`, `components/marketing/ProductScrollStory.tsx`

**Why:** Prior landing felt static; user wants Windsurf/Sentry-level motion that shows the product.

**Next:** User sets Terms URL to `/terms` in Google Branding → re-verify.

---

## 2026-08-12 — Marketing landing + auth visual refresh

**What:** Ink/teal marketing surface (logo-aligned) with Syne + DM Sans, shared atmosphere, animated resume↔job MatchStage, Framer Motion page-load. Login/signup/forgot/reset use the same look.

**Files:** `components/marketing/*`, `components/auth/AuthShell.tsx`, `app/page.tsx`, `app/(auth)/*`, `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`

**Why:** Stronger first impression + cohesive sign-in; still names HireIQ and explains purpose for Google branding.

**Next:** User reviews locally; commit/deploy when happy.

---

## 2026-08-12 — Google OAuth verification runbook

**What:** Step-by-step branding + sensitive-scope (`gmail.readonly`) submission checklist with paste-ready justification and demo-video script.

**Files:** `docs/GOOGLE-VERIFICATION.md`, `docs/AUTH.md`, `docs/STATUS.md`

**Why:** Site assets are live; remaining work is Google Console + Search Console (human).

**Next:** User verifies domain → fixes Terms URL → re-requests branding → records demo → submits app verification; Test users until approved.

---

## 2026-08-12 — Public HireIQ landing + Terms for Google branding

**What:** Logged-out `/` is a public landing that names **HireIQ** and explains resume tailor + application tracking (+ optional email sync). New `/terms`. Privacy footer links to Terms.

**Files:** `app/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx`

**Why:** Google OAuth branding verification required homepage purpose + app name match; Terms URL should not be the privacy page.

**Next:** Wait for Vercel deploy → Search Console verify `kingsharif.com` / subdomain → set branding Terms to `/terms` → re-request branding verification.

---

## 2026-08-12 — Task 143: Google login readiness + stale session cleanup

**What:** Proxy clears stale Supabase cookies on `refresh_token_not_found` (stops terminal spam). Skips `getUser` when no auth cookies (less auth API chatter on public pages). Login/signup map “provider not enabled” to a clear message. AUTH.md §3 checklist with exact Supabase callback URI. Extension Google popup error copy points to enable steps / Connect HireIQ.

**Files:** `proxy.ts`, `lib/auth/messages.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `extension/src/auth.ts`, `docs/AUTH.md`, `docs/TASKS.md`, `docs/STATUS.md`

**Why:** App UI already has Continue with Google; Supabase still returns `provider is not enabled` until dashboard + Google Cloud OAuth are configured. Dead refresh cookies + Set-Cookie churn was helping drive `/login` refetch storms in dev.

**Next:** User enables Google in Supabase → smoke site login → extension Connect (email or Google).

---

## 2026-08-12 — Privacy Policy page + Google verification assets

**What:** Public `/privacy` policy covering account, resumes, Gmail readonly, GitHub, masked email, AI processors; logo in `public/`; login link to privacy.

**Files:** `app/privacy/page.tsx`, `public/logo.*`, `app/layout.tsx`, login page, docs

**Why:** Required for Google OAuth verification / consent screen.

**Next:** Point Google verification at `https://hireiq.kingsharif.com/privacy`.

---

## 2026-08-12 — Settings + Google Gmail at signup + tracking modes

**What:** `/dashboard/settings` (Integrations + Account); Profile in primary nav; exclusive `email_tracking_mode` (gmail|masked|off); Google login requests `gmail.readonly` and persists refresh token when available; project GitHub/Resume badges; hide Email tab when off. Migration **018** applied.

**Files:** auth google sign-in, auth callback, settings UI/APIs, nav, JobDetailPage, profile EntryCard, migrations 018, docs

**Why:** Clear permissions surface; one Google consent for tracking; mutual exclusive tracking paths.

**Next:** Smoke Google login + Gmail persist; reconnect Gmail if already signed in without refresh token.

---

## 2026-08-12 — Task 114 slice 2: Gmail sync poller + shared inbound linker

**What:** Applied migrations **016** + **017**. Shared `linkInboundEmailForUser`; Gmail list/get + token refresh; user **Sync now** (`POST /api/google/sync`) and batch cron (`/api/cron/gmail-sync`). Matched mail → `email_log` source `gmail` + notifications.

**Files:** `016_gmail_sync.sql`, `017_inbound_provider.sql`, `lib/email/{link-inbound,process-inbound}.ts`, `lib/google/{gmail,sync}.ts`, `app/api/google/sync`, `app/api/cron/gmail-sync`, `GoogleConnectPanel.tsx`, docs

**Why:** Finish MVP path from mailbox → tracker once OAuth client is configured.

**Next:** Add `GOOGLE_CLIENT_*` (+ optional `CRON_SECRET`) locally/Vercel; connect Gmail in Profile; Sync now smoke.

---

## 2026-08-12 — Task 114 slice 1: Gmail connect + opt-out pref

**What:** Separate Google OAuth (gmail.readonly + offline) mirrored after GitHub connect; `google_connections` + `profiles.gmail_sync_enabled` (default true); Profile → Personal **Gmail tracking** panel. No mailbox scan yet.

**Files:** `docs/supabase/migrations/016_gmail_sync.sql`, `lib/google/*`, `app/api/google/{connect,callback,disconnect,status}`, `GoogleConnectPanel.tsx`, `.env.example`, docs

**Why:** Store refresh tokens + opt-out before building the poller; Supabase Google login does not grant Gmail scopes.

**Next:** Apply migration 016; add GOOGLE_CLIENT_* locally; then Gmail poller → inbound_email_events / email_log.

---

## 2026-08-12 — Extension v0.9.5: panel IA (Autofill + Questions)

**What:** Folded Documents into **Autofill Information** (profile + progress % + generate/attach). Renamed review to **Questions**. Resume is a progress checklist item; Submit blocks whenever the form has a resume upload (not only entry-level).

**Files:** `extension/src/content.ts`, `extension/package.json`, `extension/manifest.config.ts`, `docs/EXTENSION.md`, `docs/STATUS.md`, `docs/TASKS.md`

**Why:** Match panel IA lock — one autofill truth surface; no separate “attach to submit” Documents product.

**Next:** Reload unpacked extension → refresh apply tab; then Task 114 Gmail MVP.

---

## 2026-08-12 — Docs sync: Resend prod + deploy + next queue

**What:** STATUS/EMAIL/TASKS updated for production HireIQ (`hireiq.kingsharif.com`), Resend receiving on `mail.kingsharif.com`, migration 015, Vercel env hygiene, and the dual-path email plan (114 Gmail MVP / 139 live mask / 140 v2 reply-relay). Task 141 deploy marked DONE.

**Files:** `docs/STATUS.md`, `docs/EMAIL.md`, `docs/TASKS.md`, `docs/CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/AUTH.md`

**Why:** Keep agents aligned after deploy + product lock from extension chat.

**Next:** Prod smoke for 139 → Task 114 → extension panel IA → Task 140.

---

## 2026-08-12 — Lock: Gmail MVP tracking (default on), mask reply-relay v2

**What:** Documented product lock — MVP tracks employer mail via Gmail readonly (opt-out); Task 114 elevated; Task 140 added for v2 mask/reply relay. Extension panel IA: Autofill+progress + Questions; resume gate when upload present as progress item.

**Files:** `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/STATUS.md`, `docs/EMAIL.md`, `docs/CHANGELOG.md`

**Why:** Clear MVP vs v2 so we don’t block on forwarding infra; Google users get tracking without a second identity.

**Next:** Implement Task 114 (OAuth + scan + opt-out pref); panel IA refactor when scheduled.

---

**What:** Infer country from profile location (e.g. Fort Worth, TX → United States) and fill/match Country comboboxes with typeahead filter; entry-level/intern/new-grad jobs with a resume upload block Submit until a tailored resume is attached.

**Files:** `lib/extension/{location-country,entry-level}.ts`, `app/api/extension/profile/route.ts`, `extension/src/{autofill,content}.ts`, tests

**Why:** Required fields need the right option format; early-career apps need a real resume attached.

---

## 2026-08-10 — Task 139: Masked inbound via Resend

**What:** Per-user application email on `MASKED_EMAIL_DOMAIN` (e.g. `mail.kingsharif.com`). Resend `email.received` webhook verifies Svix, stores `inbound_email_events`, matches open applications by company signal, appends to `email_log` (All outreach / job Email), notifies, optional forward via Resend Send. Profile → Personal → Application email (create/copy/forward). Migration **015** applied remotely via Supabase MCP.

**Files:** `015_masked_inbound_email.sql`, `lib/email/*`, `app/api/webhooks/resend/inbound`, `app/api/profile/masked-email`, `MaskedEmailCard.tsx`, types, `.env.example`, `docs/EMAIL.md`, docs

**Why:** Sprout-style tracking without Gmail read / CASA.

**Next:** Set Resend API key + webhook secret + tunnel/prod URL; extension can autofill masked email later.

---

## 2026-08-10 — Extension v0.9.3: ask for missing profile fields

**What:** If Autofill finds phone/email/LinkedIn/etc. empty on master profile, review shows “(missing from profile)” with Add & use; after accept asks **Save to your HireIQ profile?**

**Files:** `extension/src/content.ts`, `lib/extension/{form-fill,draft-kind}.ts`, tests

**Why:** Don’t silently skip contact gaps or invent them with AI.

---

## 2026-08-10 — Extension v0.9.1: Greenhouse combobox (react-select) choices

**What:** Detect `role=combobox` / `.select__input`, open menu, read `.select__option`s; if 2–8 options show pick buttons (Yes/No); >8 → text fallback. Apply choice by clicking the option.

**Files:** `extension/src/autofill.ts`, `extension/src/content.ts`, docs

**Why:** Greenhouse “Select…” is not a native `<select>`; sponsorship/felony were stuck as textareas.

**Next:** Other ATS custom dropdowns as we hit them.

---

## 2026-08-10 — Extension v0.9: choice review + Documents merge + resume focus refresh

**What:** Yes/No/select/radio → pick buttons in review; No → auto N/A on follow-up text fields; After save merged into Documents (Generate opens HireIQ site); tab focus refreshes tailored resumes and auto-selects newest.

**Files:** `extension/src/{content,autofill}.ts`, `lib/extension/review-choices.ts`, tests, `docs/EXTENSION.md`

**Why:** Faster closed-field answers; one Documents home; generate/edit stays on website (B); resume pickup via focus (A).

**Next:** v2 in-panel editor; website→extension resume-ready message (C).

---

## 2026-08-10 — Verify: Extension panel + JD quality (v0.8)

**What:** Confirmed unit tests (description chrome strip + polluted `extracted.summary`), `tsc`, extension build **0.8.0**, CDP smoke (`docs/scripts/ext-v08-smoke.mjs`: runtime reload 0.7→0.8, Save-first markers, Apply page kind, collapsed profile + Show fields). Tracker At-a-glance prefers company prose over glued Greenhouse chrome.

**Files:** `lib/jobs/description.ts`, `lib/jobs/__tests__/description.test.ts`, `docs/scripts/ext-v08-smoke.mjs`, docs

**Why:** Close the plan verify rung; old unpacked builds left content scripts dead until `chrome.runtime.reload()`.

**Next:** Optional board adapters; optional analyze-on-save.

---

## 2026-08-10 — Task 137: Extension panel save-first + compact UX (v0.8.0)

**What:** Panel boots with `GET /api/extension/jobs/by-url`; Autofill/Submit gated until Save; no auto-save on Autofill; compact profile `<details>`, progress bar without checklist in main view, accordion review; resume picker + `tailoredResumeId` on PDF attach; scrape via `./scrape`; pageKind hint.

**Files:** `extension/src/content.ts`, `extension/package.json`, `extension/manifest.config.ts`, `docs/EXTENSION.md`

**Why:** Save-first prevents orphan autofill; denser panel keeps apply flow scannable; resume pick wires Task 136 APIs into the UI.

**Next:** Board-specific adapters if needed; live UI verify on Greenhouse/Lever apply pages.

---

## 2026-08-10 — Task 136: Extension resume list + form answers on job detail

**What:** Bearer list of tailored resumes per job; PDF export can target `?tailoredResumeId=` (ownership-checked) and echoes that id in availability JSON; dashboard Activity tab shows editable `form_answers` via session-authed answers API.

**Files:** `app/api/extension/jobs/[id]/{resumes,pdf}/route.ts`, `app/api/applications/[id]/answers/route.ts`, `lib/applications/form-answers.ts`, `ApplicationAnswers.tsx`, `JobDetailPage.tsx`, `tracker/[jobId]/page.tsx`, tests

**Why:** Extension needs to pick which tailored PDF to attach; users need to review/edit/delete autofill answers on the website.

**Next:** Wire extension panel to resume list + chosen PDF id (light touch).

---

## 2026-08-10 — Task 135: Job description quality

**What:** Extension job save normalizes apply URLs, scrapes Greenhouse/Lever/Ashby/Workday when body text is weak/chrome-junk, and stores a cleaned description with paragraph-based summary/responsibilities. Detail UI strips ATS chrome, hides empty Requirements/Keywords, and shows full posting as real paragraphs.

**Files:** `app/api/jobs/route.ts`, `lib/jobs/description.ts`, `lib/jobs/__tests__/description.test.ts`, `components/jobs/detail/JobSummary.tsx`, docs

**Why:** Extension DOM scrape was gluing “Back to jobs…TexasApplyCompany” into one blob; users need readable JD text without fake empty-state sections.

**Next:** Extension content scrape improvements (separate agent); optional backfill for older junk rows.

---

## 2026-08-10 — Task 117 Phase 3: user-watched Submit

**What:** Panel **Submit on this site** finds Submit/Apply (Greenhouse-style scoring), confirms if review answers are pending, clicks while you watch, then marks the job **Applied** via Bearer `PATCH /api/extension/jobs/[id]/status`. LinkedIn/Indeed blocked. Extension **v0.7.0**.

**Files:** `lib/extension/submit-button.ts`, `extension/src/submit.ts`, `extension/src/content.ts`, `app/api/extension/jobs/[id]/status`, tests, docs

**Why:** Hybrid queue — fill + review, then user-triggered submit on the visible tab (no silent bot).

**Next:** Board-specific adapters (Lever/Ashby/Workday) if generic finder misses; optional multi-step “Continue” flow polish.

---

## 2026-08-09 — Task 117: Extension autofill AI drafts + accept + PDF APIs

**What:** Backend for extension autofill — AI drafts (sensitive-safe), accept write-back to `applications.form_answers` with optional master pendingSuggestions, Bearer PDF export, and idempotent job save by `apply_url`. Migration 014 applied remotely.

**Files:** `014_application_form_answers.sql`, `lib/extension/{sensitive-fields,draft-kind,autofill-context}.ts`, `lib/ai/prompts.ts`, `app/api/extension/autofill/{drafts,accept}`, `app/api/extension/jobs/[id]/pdf`, `app/api/jobs/route.ts`, types, unit tests

**Why:** Panel needs server-grounded drafts + durable answers without inventing EEOC/legal fields.

**Next:** Wire extension content to live APIs + smoke on Greenhouse/Lever.

---

## 2026-08-09 — Task 117: Extension autofill UX (animated + review queue)

**What:** Autofill auto-saves the job, animates known profile fills, drafts unknown answers as provisional (muted gray + amber dashed), shows Accept/Edit/Skip review cards, optional “Also save to master?”, and attaches resume/cover PDFs via SW base64 fetch. Extension **v0.6.0**.

**Files:** `extension/src/{autofill,content,api,background,file-attach}.ts`, `lib/extension/form-fill.ts` (`isSensitiveFieldLabel`), tests, `docs/EXTENSION.md`

**Why:** Jobright-style watch-it-fill with AI drafts the user must review before submit.

**Next:** Backend drafts/accept/pdf routes (sibling) + smoke on Greenhouse/Lever.

---

## 2026-08-09 — Task 134: Applications All outreach

**What:** Applications has **All applications | All outreach**. Outreach lists every logged email across jobs (newest first), filterable by Sent/Received/Notes and search; click opens that job’s Email tab. Deep link: `/dashboard/tracker?view=outreach`.

**Files:** `lib/applications/outreach.ts`, `OutreachList.tsx`, `ApplicationsTracker.tsx`, `tracker/page.tsx`, tests, docs

**Why:** Sprout-style “everything I’ve sent” without waiting on Gmail.

**Next:** Gmail sync into the same store (Phase 2).

---

## 2026-08-09 — Task 132: Job resume editor full-bleed + zoom/pan

**What:** Editing a job resume opens a full-bleed Teal workspace (Content · Designer · Analyzer · Job Matcher · Cover Letter). Preview supports zoom up to 175%, left-align when zoomed, and drag-to-pan / scroll so the page isn’t clipped.

**Files:** `JobResumeEditor.tsx`, `DocumentsWorkspace.tsx`, `JobMatcherPanel.tsx` (`fullBleed`), `ResumePreview.tsx` (`enablePan`, wider zoom), docs

**Why:** Job Documents edit was too narrow and zoom couldn’t pan left — blocked reading the resume while matching.

**Next:** Task 134 All outreach.

---

## 2026-08-09 — Task 133: Suggest for master + accept follow-up

**What:** Tailor no longer auto-writes master pending. Applications → Questions has **Suggest for master**. Thin Accept opens a follow-up sheet (title + ≥1 bullet required; dates/company/URL optional). Provenance shows muted `From …` on bullets and entry cards.

**Files:** `lib/profile/suggestion-followup.ts`, `provenance.ts`, `AcceptFollowUpSheet.tsx`, `PendingSuggestionsPanel.tsx`, `app/api/profile/suggestions/**`, `tailor/generate`, `QuestionsPanel`, JobDetailPage, primitives/sections/ProvenanceBulletEditor, tests, docs

**Why:** Master grows only when the user opts in; Accept gathers missing facts before commit.

**Decisions:** 2026-08-09 follow-up A + provenance A + explicit suggest A.

**Next:** Task 132 job editor full-bleed + zoom/pan; Task 134 All outreach.

---

## 2026-08-09 — Task 131: Profile = unified master resume

**What:** Profile is one page with section nav (Documents + master). Pending accept/deny live on the section they belong to. Retired hub doors and `/builder/master` as master editor; legacy routes redirect. Builder library points to Profile for master edits; job matcher links go to tracker Documents (`?tab=documents`).

**Files:** `ProfileHome.tsx`, `profile/**` pages, `builder/master` redirect, `ResumeLibrary`, tracker/jobs/tailor/resume links, `JobDetailPage` tab query, `PendingSuggestionsPanel`, docs, ui-shots

**Why:** Master career truth + kept documents belong on Profile; Teal tools belong on per-job resumes.

**Decisions:** 2026-08-09 Profile IA grill (all A).

**Next:** Task 132 job editor full-bleed + zoom/pan; Suggest for master; All outreach.

---

## 2026-08-09 — Website connect auth + ATS account prompt

**What:** Preferred connect = open `/extension/connect` tab (Google or email login on HireIQ) → one-time code → extension session. Added `extension_connect_codes` + `applications.ats_account_email`. Panel detects employer login/signup walls and lets users save the ATS email for tracking (no mask-email account creation).

**Files:** migration `013`, `lib/extension/connect.ts`, `app/api/extension/connect/*`, `app/extension/connect/*`, `app/api/extension/jobs/[id]/ats-account`, extension popup/background/content/detect-auth-wall, login `next` support, docs

**Why:** Same login as the website; no chromiumapp redirect; popup-blocker safe.

**Next:** Show ATS email on tracker job detail; Gmail status matching.

---

## 2026-08-09 — Extension panel: master autofill preview + post-save actions

**What:** Panel shows Jobright-style **Your Autofill Information** from master profile; after save offers Generate tailored resume / Cover letter / Open in HireIQ. Save API returns `saved` metadata + document URLs. Company scrape fixed for Greenhouse titles. Trimmed research tabs; verified save (title, company, location, JD).

**Files:** `extension/src/content.ts`, `app/api/jobs/route.ts`, `app/api/extension/profile/route.ts`, docs scripts

**Why:** Match competitor loop: save → generate docs on site → autofill form from master.

**Next:** Website connect auth; ATS account/login helper (manual credentials — no mask-email account creation).

---

## 2026-08-09 — Extension Google sign-in (replace token paste)

**What:** Extension popup **Sign in with Google** via `chrome.identity` + Supabase OAuth. APIs accept Supabase access JWT or legacy `hiq_` token. Dashboard copy updated; token kept as advanced fallback.

**Files:** `lib/extension/tokens.ts`, `app/api/jobs`, `app/api/extension/profile`, `extension/src/{auth,settings,popup,background,api,manifest,vite.config}*`, `ExtensionConnectPanel`, `docs/EXTENSION.md`, `docs/AUTH.md`

**Why:** Same Google account as the website — no copy/paste token for normal use.

**Next:** Add each unpacked extension ID’s `https://<id>.chromiumapp.org/` to Supabase Redirect URLs.

---

## 2026-08-09 — Task 117 Phase 2a: Jobright-style panel + profile autofill

**What:** Live-tested Teal tracker + Jobright autofill on Greenhouse; wrote playbook. HireIQ extension now uses a **right sidebar** (Autofill · Save to HireIQ · Open in HireIQ · form progress checklist). New `GET /api/extension/profile` returns contact fields for token auth. Shared field classifier in `lib/extension/form-fill.ts`.

**Files:** `docs/EXT-LIVE-PLAYBOOK.md`, `docs/EXTENSION.md`, `lib/extension/form-fill.ts` + tests, `app/api/extension/profile/route.ts`, `extension/src/{content,autofill,popup,manifest,vite.config}*`, TASKS/STATUS

**Why:** Mirror Jobright’s on-page autofill + Teal’s save→dashboard workspace, wired to HireIQ.

**Decisions:** Fill empties only (don’t overwrite user edits); never auto-submit; match score / resume attach / improvement Qs deferred.

**Next:** Load unpacked `extension/dist` in research Chrome; Phase 3 review-queue submit; resume PDF attach; score + questions deep-link.

---

## 2026-08-08 — Task 116: Chrome extension save-to-tracker

**What:** Phase 1 Chrome extension — one-click save from any job page into Applications. Dashboard issues a one-time `hiq_` token (hash stored in `api_tokens`). Extension posts to token-authed `POST /api/jobs`; DB trigger creates the tracker row. MV3 package lives in `extension/` (Vite + CRXJS).

**Files:** `012_api_tokens.sql`, `lib/supabase/admin.ts`, `lib/extension/tokens.ts` + tests, `app/api/extension/token`, `app/api/jobs/route.ts`, `ExtensionConnectPanel`, `HomeTiles`, `extension/*`, `docs/EXTENSION.md`, AUTH, `.env.example`, active docs

**Why:** IA / Teal roadmap — save-to-tracker first, independently usable before autofill (Task 117).

**Decisions:** Service-role client for token verify + insert; no AI on the save path; one active token per user (regenerate revokes prior).

**Next:** Task 117 autofill + review-queue; user must set `SUPABASE_SERVICE_ROLE_KEY` locally.

---

## 2026-08-08 — Task 129: Resume Builder library (Teal)

**What:** `/dashboard/builder` is now a library landing — import, edit master, list uploaded resumes, and past job tailored versions. The Teal Content Editor / Designer / Matcher workspace moved to `/dashboard/builder/master`. Legacy `?tab=` / `jobId` deep links redirect to master. Resume detail and tracker matcher links updated. Same `resumes` document set as Profile → Documents.

**Files:** `components/builder/ResumeLibrary.tsx`, `app/dashboard/builder/{page,master/page}.tsx`, `ProfileWorkspace.tsx`, TrackerList/Board, CoverLetterPanel, tailor + jobs redirects, resume detail, DocumentsVault, ui-shots, active docs

**Why:** IA reset — Resume Builder library separate from Profile; two doors to the same document set.

**Decisions:** Master editor still edits `profiles.profile_data` (not per-row `resumes.structured_data`) to avoid a schema rewrite; "Open in editor" opens master. Past job versions deep-link to tracker job detail.

**Next:** Chrome save-to-tracker → autofill+submit; or remaining Phase 2 backlog.

---

## 2026-08-06 — Task 128: Sprout Profile (Documents + Professional Profile)

**What:** Replaced Profile stubs with a real Sprout hub: Documents vault (`resumes` + additional docs + attachments) and Professional Profile (structured master editors). No Teal tabs, preview, or Job Matcher on Profile. Shared save hook and section nav/panel; Builder keeps Teal chrome via the same extract. `?section=` deep links route to Documents or Professional instead of Builder.

**Files:** `components/profile/{ProfessionalProfile,DocumentsVault,useProfileSave,ProfileSectionNav,ProfileSectionPanel,ProfileWorkspace,ProfileLanding}`, `lib/profile/{sections,load-workspace,resume-row}`, `app/dashboard/profile/**`, `app/dashboard/{builder,resume}/page.tsx`, ui-shots, active docs

**Why:** IA reset — Profile ≠ Resume Builder chrome; master career truth + quiet document vault.

**Decisions:** Attachments live under DOCUMENTS group. Profile editors omit inclusion checkboxes (Builder Content Editor keeps them). Same `resumes` set for Documents and future Builder library (Task 129).

**Next:** Task 129 Resume Builder library (Teal).

---

## 2026-08-06 — Task 127: Navigation shell

**What:** Primary nav is now Dashboard · Applications · Resume Builder. Profile is reached only from the account avatar (desktop rail + mobile bottom Account menu). Shared `primary-nav.ts` keeps Sidebar and MobileNav in sync. `/dashboard/profile` is a real hub with Documents and Professional Profile doors (stubs until Task 128); legacy `?section=` deep links still open Builder.

**Files:** `components/shared/{primary-nav.ts,Sidebar,MobileNav,DashboardShell}`, `HomeTiles.tsx`, `ProfileLanding.tsx`, `app/dashboard/profile/**`, `docs/scripts/ui-shots.mjs`, `DESIGN-IA-RESET.md`, active docs

**Why:** IA reset — Profile ≠ Resume Builder chrome; Applications naming; Profile only from account icon.

**Decisions:** Interim Profile stubs link into current Builder content rather than duplicating Teal workspace. Mobile Account slot is avatar menu, not a fourth primary product item.

**Next:** Tasks 128–129 Profile (Sprout) + Resume Builder library (Teal).

---

## 2026-08-05 — Task 130b: Tracker detail polish

**What:** Tightened the tracker detail after live desktop/mobile review: the mobile status selector now shares the action row, the full desktop facts rail can hide and restore, Notes and Activity use one action, formatted JD sections have concise limits, the timeline is newest-first, and the manual email form starts collapsed.

**Files:** `components/jobs/JobDetailPage.tsx`, `components/jobs/detail/{JobSummary,ActivityPanel,EmailInbox}.tsx`, `lib/jobs/description.ts`, description tests

**Why:** Preserve more working space for the application content and make the primary tracker views faster to scan.

**Decisions:** Keep the full status progression visible on desktop; use one compact native selector on mobile. Keep manual email logging available without letting its form dominate the inbox.

**Next:** Task 127 navigation shell, then Tasks 128–129 Profile and Resume Builder library.

---

## 2026-08-05 — Task 130: Tracker detail completion

**What:** Rebuilt the application detail into six focused tabs with a compact structured job brief, collapsible facts/activity rail, readable Q&A, fixed-job two-pane resume editing, full live preview, combined notes/timeline, and a Sprout-style manual inbox. Added canonical skill IDs to remove duplicate React keys and coupled checkboxes. Manual events and email-linked events now use authenticated application APIs.

**Files:** `components/jobs/JobDetailPage.tsx`, `components/jobs/detail/*`, builder/preview components, `lib/applications/*`, `lib/jobs/description.ts`, `lib/profile/{skills,inclusion}.ts`, application APIs, tracker routes, tests, UI audit script

**Why:** Finish the current Applications experience before moving to the separate Resume Builder library, while keeping manual email storage compatible and future Gmail storage correctly isolated.

**Decisions:** Activity absorbs Notes; Email is a separate inbox. No Gmail OAuth or schema migration in this pass. Future provider messages use dedicated child storage behind the same inbox view model.

**Next:** Task 127 navigation shell, then Tasks 128–129 Profile and Resume Builder library.

---

## 2026-08-04 — Task 126: Full-page application detail

**What:** Applications tracker opens jobs on a full page (`/dashboard/tracker/[jobId]`) with Overview · Job description · Documents · Questions · Notes · Email · Timeline. Header keeps status + match score + tailor/apply. Side drawer removed. Legacy `?jobId=` and `/jobs/[id]` redirect here.

**Files:** `JobDetailPage.tsx`, `tracker/[jobId]/page.tsx`, `ApplicationsTracker.tsx`, `tracker/page.tsx`, deleted `JobDrawer.tsx`, redirects, `DESIGN-IA-RESET.md`

**Why:** IA reset — Teal/Sprout full job detail, not a side panel

**Next:** Task 127 nav shell, then Profile / Resume Builder

---

## 2026-08-04 — IA reset locked (Teal × Sprout grill)

**What:** Replaced wrong “Profile = Teal builder + job drawer” direction. Locked nav, Profile (Documents + Professional Profile), Applications full-page tabs, master update rules, Chrome roadmap, build order starting at Applications.

**Files:** `docs/DESIGN-IA-RESET.md`, `docs/DECISIONS.md`, `docs/TASKS.md` (126–129), `docs/STATUS.md`

**Why:** User clarified Sprout profile vault + Teal tracker/builder; simple upload→tailor→apply

**Next:** Task 126 when user says go

---

## 2026-08-03 — Task 125: Content Editor + Matcher inclusion

**What:** Teal Content Editor (accordion + include checkboxes) is the primary Content tab; live preview respects session inclusion. Job Matcher is a Teal split: left ContentEditor, right match score/keywords + filtered preview; Save writes `tailored_resumes.inclusion`. Shared `applyInclusion` helper + unit tests.

**Files:** `ContentEditor.tsx`, `JobMatcherPanel.tsx`, `ProfileWorkspace.tsx`, `lib/profile/inclusion.ts`, `inclusion.test.ts`

**Why:** Finish Teal parity wiring so user can review what’s left to change

**Next:** User review pass; then polish gaps (inline edit depth, drawer Contacts, etc.)

---

## 2026-08-03 — Tasks 119–124: Teal chrome IA rewrite

**What:** Home tiles; nav Home · Resume Builder · Job Tracker; status expansion (bookmarked…rejected); Teal-style tracker table/board + job drawer (Info/Notes/Resumes/Email/Templates); builder 5 tabs with Job Matcher inclusion; Tailor stepper retired via redirects. Migration 011 applied.

**Files:** home/*, Sidebar, MobileNav, tracker/*, JobDrawer, builder panels, ProfileWorkspace, 011 migration, types/status APIs

**Why:** Locked Teal chrome + HireIQ master resume model

**Next:** Deeper Job Matcher Q&A → master provenance; Contacts/Check List; Extension

---

## 2026-08-03 — Design lock: Teal chrome + HireIQ master

**What:** Grilled and locked IA rewrite — Home tiles, nav Home/Builder/Tracker, kill Tailor stepper, Teal tracker+drawer, 5 builder tabs, per-job inclusion on tailored_resumes, expanded statuses. Docs only (Tasks 119–124 queued).

**Files:** `docs/DESIGN-TEAL-PARITY.md`, `docs/DECISIONS.md`, `docs/TASKS.md`

**Next:** Task 119 IA shell when user says go

---

## 2026-08-02 — Tasks 107 + 113: Applications schema + Kanban tracker

**What:** Added `applications` + `application_events` (migration 010, applied). Backfilled 1:1 from `jobs`; insert trigger keeps new jobs tracked. Status updates write events and mirror `jobs.application_status`. Applications home: Table (default) | Board toggle with drag-and-drop status columns.

**Files:** `010_applications.sql`, `lib/applications/status.ts`, status API routes, `ApplicationsTracker.tsx`, `TrackerBoard.tsx`, `TrackerList.tsx`, `app/dashboard/page.tsx`, `JobHub.tsx`, `types/index.ts`

**Why:** Spec §4.1 + Teal parity tracker (DESIGN-TEAL-PARITY §B)

**Next:** Phase 2 Gmail (114) / forward-to-save (115); or expand statuses (Bookmarked / Applying)

---

## 2026-08-02 — Task 118: Nav + Applications/Tailor UI

**What:** Documents is now a primary sidebar/mobile nav item (profile · resumes · designer). Applications home and Tailor flow restyled to match Job Hub — cleaner list rows, status chips, clearer CTAs, less purple card clutter.

**Files:** `Sidebar.tsx`, `MobileNav.tsx`, `app/dashboard/page.tsx`, `tailor/page.tsx`, `jobs/page.tsx`

**Next:** Task 107 applications schema → 113 Kanban

---

## 2026-08-02 — Task 112b: Full Design Mode

**What:** Teal-style Designer on Profile (Content Editor | Designer). Presentation / Sections / Settings / Advanced controls for visual theme (font, accent, alignments, margins, section order/labels, experience & education layout, font sizes, spacing). Live preview + PDF honor theme. Master theme persisted on `profiles.resume_theme`. Migration 009 applied.

**Files:** `components/builder/designer/*`, `ProfileWorkspace.tsx`, `ResumePreview.tsx`, `lib/export/theme.ts`, `pdf-generator.tsx`, migration 009

**Why:** Locked full Teal Design Mode (visual only) with responsive chrome

**Next:** Per-job `theme_override` UI in Job Hub; optional Job Hub Designer tab

---

## 2026-08-02 — Tasks 110–112: Teal workspace + theme foundation

**What:** Job Hub rebuilt as Teal-style split (Match Score / Keywords / Changes / Q&A / Job + live preview). Live re-score API on save. Profile builder gets sticky ResumePreview (desktop) / collapsible (mobile). ResumeTheme types + PDF theme wiring + migration 009 (not applied).

**Files:** `components/jobs/JobHub.tsx`, `components/jobs/workspace/*`, `components/profile/ProfileWorkspace.tsx`, `app/api/tailor/[id]/score`, `lib/export/theme.ts`, `lib/export/pdf-generator.tsx`, `lib/scoring/tailored-rescore.ts`, migration 009

**Why:** Teal parity Branch A — analysis layout + builder shell + theme foundation for Design Mode

**Next:** Designer UI (112b); apply migration 009 when ready; UI-verify Job Hub after Playwright can reach Supabase

---

## 2026-06-29 — Fix: GitHub connect (direct OAuth)

**What:** Replaced Supabase `linkIdentity` (requires manual linking) with direct GitHub OAuth via `/api/github/connect` + `/api/github/callback`. Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

**Files:** `lib/github/oauth.ts`, `app/api/github/connect`, `app/api/github/callback`, `GitHubConnectPanel.tsx`, `docs/GITHUB.md`

---

## 2026-06-29 — Task 105: GitHub OAuth + repo sync

**What:** Profile → Projects GitHub panel (connect / sync / disconnect). Fetches repo metadata via GitHub API; stores snapshot in `profiles.github_data`; unmatched repos → pending project suggestions. Migration 008 adds `github_connections` for tokens.

**Files:** `lib/github/**`, `app/api/github/**`, `components/profile/GitHubConnectPanel.tsx`, migration 008, `docs/GITHUB.md`

**Next:** Enable GitHub in Supabase + run migration 008; Task 106 (visual QA).

---

## 2026-06-29 — Docs sync to current state

**What:** Updated all active session docs to reflect Tasks 100–104 complete, Next.js 16 `proxy.ts`, migration status, and next queue (105–107). Fixed duplicate Task 105 ID (applications → 107). Added legacy doc pointers.

**Files:** `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/README.md`, `docs/AUTH.md`, `README.md`, `docs/legacy/**` banners

---

## 2026-06-29 — Fix: Next.js 16 proxy convention

**What:** Removed `middleware.ts`. Auth session refresh and route guards live in `proxy.ts` only — Next.js 16 renamed middleware → proxy, and `config` must be defined in that file (not re-exported).

**Files:** `proxy.ts`, deleted `middleware.ts`, `docs/AUTH.md`, `docs/STATUS.md`, `docs/TASKS.md`

---

## 2026-06-29 — Task 104: Basic auth hardening

**What:** Wired `proxy.ts` (session refresh + route guards). Added forgot/reset password flow. Profile trigger migration 007 sets first/last name from email signup and Google OAuth. Auth callback syncs profile metadata. Added `docs/AUTH.md` setup guide.

**Files:** `proxy.ts`, `app/(auth)/*`, `lib/auth/*`, `components/auth/AuthShell.tsx`, migration 007

**Next:** Run migration 007 in Supabase; configure redirect URLs per AUTH.md.

---

## 2026-06-29 — Task 103: Workday + LinkedIn job URL handling

**What:** Workday careers URLs fetch via internal `/wday/cxs/` API. LinkedIn job URLs blocked with `LINKEDIN_BLOCKED` code and UI redirect to Paste Text. Indeed/ZipRecruiter/Glassdoor show aggregator warning.

**Files:** `lib/jobs/url-detect.ts`, `lib/jobs/job-scraper.ts`, `app/dashboard/jobs/page.tsx`, tests

**Next:** Task 104 (GitHub OAuth) or Task 106 (visual render QA).

---

## 2026-06-29 — Task 101: Structured 3-tier gap analysis

**What:** `/api/tailor/questions` now runs `GAP_ANALYSIS_PROMPT` returning direct/adjacent/real gaps plus max 3 questions. Gap summary shown on tailor step 4 before Q&A. Real gaps and adjacent framing injected into tailor generate/regenerate prompts.

**Files:** `lib/ai/gap-analysis.ts`, `lib/ai/prompts.ts`, `app/api/tailor/questions/route.ts`, `components/tailor/GapAnalysisSummary.tsx`, `store/index.ts`, `app/dashboard/tailor/page.tsx`, `lib/ai/tailor-pipeline.ts`

**Next:** Task 103 (Workday + LinkedIn job URLs).

---

## 2026-06-29 — Task 102: Tracked changes accept/decline

**What:** Interactive diff review on Job Hub Changes tab. Accept/decline/edit per change with decline reasons. Export (PDF/DOCX) uses approved resume; blocks while changes are pending. Migration 006 adds `original_structured_data` and `change_decisions` columns.

**Files:** `lib/tailor/change-decisions.ts`, `components/tailor/TailorDiff.tsx`, `components/jobs/JobHub.tsx`, `app/api/tailor/[id]/decisions/route.ts`, export routes, `docs/supabase/migrations/006_change_decisions.sql`

**Why:** Spec §3.6 — key UX differentiator for tailoring workflow.

**Next:** Run migration 006 in Supabase; Task 101 (structured gap analysis).

---

## 2026-06-29 — Task 100: Docs layout + spec alignment audit

**What:** Reorganized repo so `main` is application code only. Created agent session docs mapping current implementation to SPEC v1.0. Moved `prototype/`, `scripts/`, `supabase/`, and legacy spec into `docs/`.

**Files:** `docs/**`, `README.md`, `package.json`, `.gitignore`, `.cursor/rules/verification.mdc`, `app/dashboard/notifications/page.tsx`

**Why:** Clean workspace for building Phase 1; single source of truth for what exists vs what the spec requires.

**Next:** Task 101 (structured gap analysis) or Task 102 (accept/decline diff UI).
