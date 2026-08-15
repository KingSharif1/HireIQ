# HireIQ Decisions

## 2026-08-15 — Tailor rewrite: markdown wire + stream progress

**Context:** Giant JSON rewrites break on huge JDs (Apple Early Career: `Expected ',' or ']'…`). Users wait minutes with a static spinner. Cover letter already streams.

**Locks:**
| Area | Choice |
|------|--------|
| Storage / diffs / export | Still **StructuredResume** JSONB — not markdown files on disk |
| Model wire format | **HireIQ markdown** in and out (`lib/resume/markdown.ts`) with `<!-- id:… -->` markers |
| Gap analysis | Resume fed as markdown; response stays small JSON; streamed into process_log |
| Resume parse | AI returns markdown → StructuredResume for storage; NDJSON progress to UI |
| Job analyze | Small JSON (schema fits); streamed with NDJSON progress events |
| Streaming | Stream tokens on linear AI waits; throttle progress updates |
| Retry | One markdown rewrite retry if parse empty/broken |
| Not doing | Storing `.md` blobs as source of truth; streaming raw half-JSON as storage |

**Tradeoff:** Deterministic MD↔structured must stay strict; bad headings can drop sections (retry + normalize mitigate).

**Revisit if:** Diff quality drops because ids are lost — tighten id markers or add matcher.

---

## 2026-08-15 — Hosted auto-apply on easy public forms (Task 157)

**Context:** Not every career URL is Greenhouse. Some company sites are a name/email/resume form; others force account signup (Workday, Taleo, LinkedIn).

**Locks:**
| Area | Choice |
|------|--------|
| Show Auto-apply | `apply_ease === easy`: GH/Lever/Ashby, similar ATS hosts, or HTML with contact fields + resume and no password wall |
| Hide | Account portals, aggregators, LinkedIn, Workday, Amazon/Microsoft careers, HTML login/signup walls, unknown generic URLs with no form signals |
| When | Classify on URL fetch (host first, HTML if generic). Store on `extracted_data`. Existing GH links still match from URL alone |
| Answers | Structured Application form on Profile; per-job answers still on the job Questions tab |

**Revisit if:** Hosted worker covers Workday OTP reliably.

---

## 2026-08-15 — Tailor overlay is a wait, not a pipeline (Task 156)

**Context:** Users saw “1 Claude call”, model names, and raw `JSON.parse` errors while the spinner kept going. Refresh hid failed runs and started another.

**Locks:**
| Area | Choice |
|------|--------|
| Wait UI | Short status + rotating hint. No vendor/model/call counts |
| Durable | Leave/refresh attaches to in-flight. Failed stays until Try again |
| Errors | User-facing title/message + Details log (technical). Credits / network / JSON mapped |
| Voice | Prompt: keep their diction; no generic “results-driven” unless they write that way |

---

## 2026-08-15 — One source resume + job folders (Task 155)

**Context:** Native GitHub `<select>` was unreadable. New profile cards appeared at the bottom. Harper tailored v1/v2 showed as two rows because they had different `job_id`s. Upload created extra resume rows and rewrote master. Public storage “View original” 404’d.

**Locks:**
| Area | Choice |
|------|--------|
| GitHub field | Searchable dropdown, not native select |
| Add from GitHub | New project from last sync (no extra Claude) |
| New entries | Prepend + scroll into view |
| Builder folders | Group by title+company; expand versions; name → `/dashboard/tracker/[jobId]`; no posting URL |
| Uploads | One source file; replace updates it; ask before merging new parse diffs into master |

---

## 2026-08-15 — Q&A write-back routing (Task 154)

**Context:** Gap answers were queued as raw chat text on Experience, and accept without a target attached them to the first job (Harper). IRC belonged as a new role; NEMT belonged on that project.

**Locks:**
| Area | Choice |
|------|--------|
| Wording | Prefer the tailored resume’s new bullet when it overlaps the answer; else polish the answer (no extra Claude call) |
| Projects | Name match in question/answer → that project |
| Existing job | Name match → that experience |
| New employer | Extract “worked at X” → new experience follow-up, company prefilled |
| Fallback | No target — follow-up sheet; never default to job[0] |
| Empty bullets | No “From …” label |

---

## 2026-08-15 — Profile is its own page (Task 153)

**Context:** Master resume lived inside Resume Builder as one long scroll. User wants Profile back on the rail: it is still the master resume, but also the identity store for autofill/Sprout. Tailored copies stay in Builder. GitHub “Repository” should be a picker of their repos — link only, or optionally check for a highlight. Do **not** merge tailored versions into the master from this work.

**Locks:**
| Area | Choice |
|------|--------|
| Nav | Dashboard · Applications · **Profile** · Resume Builder |
| Profile | `/dashboard/profile` — one section at a time |
| Builder | `/dashboard/builder` — uploads + tailored **grouped by job** (version dropdown) |
| Repository field | Dropdown of synced GitHub repos; paste URL still available |
| Highlights | Opt-in “Look for highlights” on that project. Sync does not dump README into pending bullets for already-listed projects |
| New repos | Sync may still ask to add a repo that is not on the profile yet, with resume-shaped copy |

**Tradeoff:** Four rail items on mobile. Profile and Builder are two clicks instead of one.

---

## 2026-08-15 — Tailor for interviews + real edit (Task 152 / PR #19)

**Context:** An Apple IS&T tailor scored 55% with 0 questions and 6 shallow changes. User asked if it even tailored; wanted questions when gaps exist; Teal-style **Edit** (not just checkboxes); Design on mobile; Match that explains what changed and interview odds; Accept only when something **new** was added; pull job-relevant projects from master for ATS.

**Locks:**
| Area | Choice |
|------|--------|
| Questions | If ATS missing skills/keywords → ask (Claude, else ATS fallback, max 3). Skip Q&A only when ATS is clean |
| Rewrite | One Claude call. Weave JD language into real bullets; no stuffing; keep user’s voice; drop unrelated projects |
| Edit UX | Always-visible **Edit** button (mobile); Save updates this job’s snapshot; master profile never written from Edit |
| Accept | Pending only for **new additions**. Rewrites of existing text auto-accepted |
| Mobile Design | Styling / Sections / Settings (+ size templates). Advanced desktop-only |
| Match | Optimization brief + before/after; tap → preview highlight (Preview pane on mobile) |
| From master | `buildJobOptimizedInclusion` prefers JD-linked projects/skills |
| Cost | No critique loop, no retries. Max 2 Claude calls |

**Tradeoff:** Asking 1–3 questions adds a wait; skipping them is how you get a 55% “tailor.”

**Doc:** [TAILOR-EDIT.md](./TAILOR-EDIT.md)

**Revisit if:** ATS fallback questions feel generic — ground them in the user’s real company names without another Claude call.

---
## 2026-08-14 — Durable tailor session (Task 151)

**Context:** Refresh / navigation remounted AI tailor and started another Claude call. User wants one session: full resume + JD from DB, compare gaps, ask questions, wait, then one rewrite — and see progress from Applications.

**Locks:**
| Area | Choice |
|------|--------|
| Storage | `tailor_runs` row; unique one in-flight per (user, job) |
| Claude budget | 0 for context/ATS; **1** gap questions if needed; **1** rewrite; max **2** |
| Overlap | CAS `gap_reserved` / `generate_reserved`. If reserved, never start another call |
| Refresh | Attach to the same run. `after()` keeps work going after the HTTP response |
| Tracker | Chip: Tailoring… / Needs your answers / Needs review |
| Failure | Stop. Stale busy (>3 min) marks failed. User can start a new session |

**Tradeoff:** A killed lambda wastes that one reserved call instead of retrying.

**Revisit if:** `after()` on Vercel is truncated before Claude returns — then move generate to a queue worker, still one reservation.

---

## 2026-08-14 — Never retry paid AI or auto-apply (Task 150)

**Context:** A tailor React loop plus the AI SDK’s default 2 retries burned Anthropic credits. User: if it messes up, do not loop to fix it — especially auto-apply and autofill.

**Locks:**
| Area | Choice |
|------|--------|
| Claude SDK | `maxRetries: 0` on every `generateText` / `streamText` |
| Tailor | Exactly one rewrite. No critique/retry loop |
| Overlap | In-flight lock → 429, do not start a second paid call |
| Auto-apply | One queue attempt. Failed/applied/needs_user does not re-queue unless user clicks “Start a new run (billed again)” |
| Autofill drafts | One Haiku call per click; overlap → 429 |
| Tailor remount | Never `router.refresh()` on generate complete; sessionStorage + jobs.`in_progress` lock |

**Tradeoff:** Transient Anthropic blips fail instead of succeeding on retry. Credits > convenience.

**Revisit if:** Anthropic 5xx becomes common enough that a single retry is cheaper than user frustration — still cap at 1 extra, never a loop.

---

**Context:** Shared Anthropic credits ran out. Users need their own key, model choice, and visibility into which model runs where and what it costs.

**Locks:**
| Area | Choice |
|------|--------|
| Default | HireIQ pooled `ANTHROPIC_API_KEY` |
| BYOK | User Anthropic key, AES-256-GCM in `user_ai_secrets` (service_role only); last4 on `profiles` |
| Models | Strong + Fast pickers from catalog (Haiku 4.5 / Sonnet 4.6 / Sonnet 5 / Opus) |
| Cost | Estimate from published $/MTok × usage.input/output tokens; auto-apply uses Cloud Run unit estimate |
| UI | Settings → AI; inline “this uses X via Y key” on generate surfaces |

**Tradeoff:** Estimates ≠ Anthropic invoice (no cache/batch split). Keys encrypted with `AI_KEY_ENCRYPTION_SECRET` or hash of service role.

**Revisit if:** Stripe packs land; then meters feed credits instead of display-only.

---
## 2026-08-13 — Cloud Run hosted apply + web-first UX

**Context:** Owner pays ~$28/mo for a KVM VPS; Cloud Run has free-tier headroom and scales. Auto-apply should be a **HireIQ website** action (not mobile-first). Extension stays for when the user is already on the ATS page. Need honesty about “any job” coverage.

**Locks:**
| Area | Choice |
|------|--------|
| Hosted runtime | **Cloud Run** (Playwright) is primary for server auto-apply |
| KVM | Optional debug/staging — not the primary apply farm |
| Primary UX | Web: **Auto-apply with HireIQ** queues Cloud Run |
| Extension | Assist when already on the job site (autofill / agentic) — not required for server apply |
| Mobile | No hosted auto-apply promise in v1 |
| Coverage | Big ATS first (GH/Lever/Ashby/Workday); improve via **learnable board adapters** on failures — not “works on every site forever” |

**Tradeoff:** Cloud Run cold starts + timeouts on very long Workday flows; revisit KVM or Cloud Run Jobs if that bites.

**Docs:** [AUTO-APPLY.md](./AUTO-APPLY.md)

---

## 2026-08-13 — Dual apply paths + draft SaaS pricing (docs only)

**Context:** Owner wants (1) the Chrome extension **and** (2) a Sprout-like **server** auto-apply, plus a pricing sketch for future customers. Earlier lock said “extension only / no credits” for personal use — superseded for product direction; personal `billing_exempt` still unlimited while building.

**Locks:**
| Area | Choice |
|------|--------|
| Runtimes | **Both:** extension (local) + hosted Playwright worker (server) |
| Hosted v0 | **Cloud Run** (amended — see decision above); KVM optional |
| Charge | Meter **tailor** and **server auto-apply**; extension autofill **free** by default |
| Tailor pack | **2 for the price of 1**, then pay per extra tailor |
| Server apply | Always charged when using our browsers (1 vs 3 by portal complexity) |
| Autofill fallback | Optional **10 free / period** then per-N — only if needed |
| Code | **Docs only for now** — no Stripe / credit tables in this change |

**Tradeoff:** Hosted apply adds real infra cost and ops; extension stays the $0 path. Dual paths share one apply engine where possible.

**Docs:** [PRICING.md](./PRICING.md) · [AUTO-APPLY.md](./AUTO-APPLY.md)

**Revisit if:** Cloud Run timeouts block Workday.

---

## 2026-08-13 — Auto-apply without Sprout-style credits (Task 147 intent) — SUPERSEDED

**Superseded by** dual-path + pricing lock above. Kept for history: extension-first personal use without credits remains valid for `billing_exempt` / free tier autofill.

**Original idea:** Extension-only agentic apply; no application credits for personal HireIQ.

---

## 2026-08-13 — Masked reply sends from HireIQ address (Task 140)

**Context:** Users who apply with a HireIQ address need to answer recruiters without exposing Gmail. Sprout routes replies through the whisperpost identity.

**Locks:**
| Area | Choice |
|------|--------|
| Compose | Job **Email** tab → **Reply via HireIQ** under a thread with a received message |
| From | `profiles.masked_email` (display name from profile) |
| Mode gate | Only when `email_tracking_mode === 'masked'` |
| Store | Append sent row to `applications.email_log` (`source: masked`) |

**Tradeoff:** Requires Resend **sending** on `mail.kingsharif.com` (not only receiving). Users on Gmail tracking mode keep replying from Gmail itself.

**Revisit if:** Need reply from All outreach for unmatched mail, or SMTP reply-all when the user answers the forward copy in Gmail.

---
## 2026-08-13 — Forward-to-save is a dedicated address (Task 115)

**Context:** Spec Module 4 / DESIGN-TEAL-PARITY C2: forward a job posting email → parse → tracker. Masked apply inbox already receives employer mail on the same domain.

**Locks:**
| Area | Choice |
|------|--------|
| Address | Separate `save.{name}.{token}@mail.kingsharif.com` (`profiles.forward_save_email`) |
| Pipeline | Reuse `saveJobFromUrl` (same as extension save) — scrape, no Claude analyze in the webhook |
| LinkedIn | Save URL + email body; do not scrape LinkedIn |
| UX | Settings → Integrations, independent of Gmail vs application-email tracking |

**Tradeoff:** Two HireIQ addresses to remember (apply vs save). Mixing both on the masked inbox would confuse employer replies with job forwards.

**Revisit if:** Users never create the save address and only want “forward anything to my apply email.”

---
## 2026-08-13 — Master resume is one scrolling page (Task 146)

**Context:** After consolidating nav, Master was still a 13-section carousel (one panel at a time). User wanted one page.

**Locks:**
| Area | Choice |
|------|--------|
| Master editor | **All sections stacked** on `/dashboard/builder?view=master` |
| Left nav | Jump links + highlight via IntersectionObserver |
| Deep links | `?section=` still scrolls to that block |
| Per-job Teal | Unchanged |

**Tradeoff:** Heavier first paint (all editors mount). One Save still covers the whole profile.

**Revisit if:** The page feels too long or we add a live preview column.

---

## 2026-08-13 — Resume Builder is one primary surface (Task 146)

**Context:** User asked to continue remaining work without a grill session. Suggested option 1 from RESUME-BUILDER.md.

**Locks:**
| Area | Choice |
|------|--------|
| Primary nav | **One Resume Builder item** — Profile removed from rail |
| Surface | `/dashboard/builder` with **Master resume** (default) + **Files & versions** |
| Old Profile URLs | Redirect to `/dashboard/builder?view=master` (keep OAuth/GitHub callbacks) |
| Per-job Teal | Stays on Applications → Documents |
| Home | Applications + Resume Builder (no separate Profile tile) |

**Tradeoff:** Originally left a section carousel; superseded by the scrolling-page lock above.

**Revisit if:** Users miss a dedicated Profile nav.

---

## 2026-08-12 — Resume Builder consolidation (intent; IA not locked yet)

**Context:** After marketing + dashboard polish, user says Applications are fine but Resume Builder feels like too many pages/tabs that should be one better page. Current ship follows 2026-08-09 Profile=master / Builder=library / Teal=job-only.

**Intent (soft lock):**
| Area | Choice |
|------|--------|
| Priority | **Task 146** — one coherent Resume Builder surface |
| Applications | Do not redesign |
| Process | Grill IA in next session before rewriting; then update this decision with hard locks |
| Brief | [RESUME-BUILDER.md](./RESUME-BUILDER.md) |

**Tradeoff:** Until grilled, keep dual Profile + Builder nav; don’t half-merge.

**Revisit if:** Next session completes Task 146 — then supersede or amend 2026-08-09 Profile lock.

---

## 2026-08-12 — Settings + email tracking modes + Google Gmail at signup

**Context:** Google login ≠ Gmail mailbox permission. Tracking UX was buried under Personal Info. User wants exclusive tracking paths and account Settings.

**Locks:**
| Area | Choice |
|------|--------|
| Tracking modes | **Mutual exclusive:** `gmail` \| `masked` \| `off` (`email_tracking_mode`) |
| Google signup | **One consent** — login scopes include `gmail.readonly` + offline; persist refresh token when Supabase returns it |
| Settings | `/dashboard/settings` — Integrations (tracking + GitHub) + Account (password, delete) |
| Nav | **Profile** in primary rail; avatar menu → **Settings** (not Profile) |
| Off mode | Hide job **Email** tab |
| Projects | Badge for GitHub / resume-sourced entries |

**Tradeoff:** Supabase must return `provider_refresh_token` (prompt=consent). If missing, Settings still offers Connect Gmail.

**Revisit if:** Google/Supabase stops issuing refresh tokens → fall back to always `/api/google/connect` after login.

---

## 2026-08-12 — Email tracking: Gmail MVP (default on), masking v2 polish

**Context:** User wants employer status updates without requiring a separate apply identity for MVP. Prefer reading the mailbox they already use when signed in with Google. Full Sprout-style mask + reply relay remains desirable but heavier.

**Locks:**
| Area | Choice |
|------|--------|
| MVP tracking | **Gmail read-only sync** (Task 114) — match employer mail to saved/applied jobs |
| Default | **On** when Google is connected — user may **opt out** |
| Email/password-only users | Soft nudge: connect Google for tracking; optional use existing masked apply address (Task 139) until Gmail connected |
| Extension Submit | Record submitted-at on HireIQ Submit to improve match confidence; mobile / manual submit still rely on mail matching |
| Accuracy | Not 100% — high-confidence auto-link; medium/low ask confirm |
| v2 | Full **masking / forwarding / reply relay** (inbound → log → forward; user reply via HireIQ or CC path). Documented; do not block MVP on it |
| Already shipped | Masked inbound address (015 / Task 139) stays available as apply-paste + forward; v2 deepens reply UX |

**Tradeoff:** Gmail `readonly` needs Google OAuth verification (CASA) for production scale; better UX for Google users than forcing a second email. Masking remains the path for non-Google and for stronger thread ownership later.

**Revisit if:** OAuth verification blocked → lean on masked inbound as primary; or per-job `+alias` forwarding ships first.

---

## 2026-08-12 — Extension panel IA + resume gate (grill lock)

**Context:** User does not want a separate Documents / “attach resume to submit” product surface. Autofill truth + progress should be one place; repetitive ATS Qs in Questions.

**Locks:**
| Area | Choice |
|------|--------|
| Panel sections | **Autofill Information** (profile + **progress %**) + **Questions** (repetitive ATS Q&A) |
| Resume | Required when form has resume upload (**gate A**); surface as a **progress item**, not a separate Documents block |
| Cover | Soft nudge only |
| Generate / edit resume | Still opens HireIQ website (B); focus-refresh list when returning |

**Revisit if:** Users miss Generate CTA without Documents section.

---

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

## 2026-08-13 — Extension agentic apply (intent; doc only)

**Context:** User wants the extension to go beyond single-page autofill: click through multi-step apply flows, create employer accounts when signup walls appear, and complete email verification — with behavior driven by the same **`email_tracking_mode`** as Settings (`gmail` | `masked` | `off`). Job URL fetching is getting a separate “learnable rules” pipeline; extension apply should follow the same pattern (document failures → add ATS rules).

**Intent (soft — not shipped):**

| Area | Choice |
|------|--------|
| Navigation | Agent clicks Next/Continue, waits for load, re-scans and autofills each step |
| `gmail` mode | Create portal account with user Gmail; OTP from **Gmail read-only sync**; continue apply |
| `masked` mode | Create with **masked inbound email**; OTP from inbound webhook; show **login override + timeline** (email, password, verification events) |
| `off` mode | **No account creation** (no inbox to verify); autofill + user-watched Submit still OK |
| LinkedIn / Indeed | No automated submit (unchanged) |
| Consent | Opt-in per job; audit events for automated actions |
| Spec | Full narrative in [EXTENSION.md](./EXTENSION.md#agentic-apply-planned) |

**Tradeoff:** Requires stable Gmail sync + masked inbound OTP parsing before build; CASA and credential storage need security review.

**Revisit if:** Task 114 + 139 production-ready → spike Greenhouse agentic path first.

---

**Context:** End users shouldn't fight `chromiumapp.org` redirects or paste tokens. Same HireIQ login (Google or email) should unlock the extension.

**Choice:** Primary flow opens `/extension/connect` in a normal tab → mints one-time `hiqc_` code → `chrome.runtime.sendMessage` (externally_connectable) → extension stores Supabase access/refresh. Fallbacks: Advanced Google via `chrome.identity`, legacy `hiq_` tokens. ATS “needs account”: detect wall, user creates account themselves, store `applications.ats_account_email` — never invent mask emails.

**Tradeoff:** Connect codes briefly store access/refresh server-side (hashed code, TTL, one-time). Simpler UX than identity OAuth for local/dev and Store builds.

**Revisit if:** Token storage on `extension_connect_codes` becomes a compliance issue (encrypt at rest / shorter TTL) or Chrome tightens externally_connectable.

---

## 2026-08-12 — Extension prod popup vs local; no silent auto-link

**Context:** Store users must not see localhost API URL / Advanced. Wanted “auto-link if already logged into the website.”

**Choice:**
| Area | Lock |
|------|------|
| Prod build (`npm run build`) | Force `https://hireiq.kingsharif.com`; hide API field + Advanced |
| Dev build (`npm run dev`) | Keep localhost field + Advanced (Google-in-window, legacy token) |
| Auto-link | Chrome forbids zero-click bind; already signed-in site + one **Connect** click = instant link |
| Dashboard panel | Instructions first; legacy `hiq_` token collapsed — not required for Store |
| `externally_connectable` | Must include `hireiq.kingsharif.com` for prod Connect |

**Tradeoff:** Two build modes; engineers must use `--mode development` for local API override.

**Revisit if:** We add a dashboard “Link extension” button that uses the same `sendMessage` path (still one click).

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
**Updated 2026-08-12:** MVP tracking for Google users is **Gmail sync (default on / opt-out)** — see decision above. Masked inbound remains for apply-paste + v2 reply-relay (Task 140).

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
