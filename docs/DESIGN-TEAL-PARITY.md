# Design — Teal Parity (Resume Builder, Tracker, Email, Extension)

**Status:** Approved via design interview (2026-07-28 → 2026-08-02)
**Build order:** A (analysis/tailor layout) → B+C (tracker + email) → D (extension)
**Reference:** Teal (app.tealhq.com) — resume builder, job tracker, Chrome extension

---

## Locked decisions

### A. Analysis & tailor layout

| Decision | Choice |
|----------|--------|
| Architecture | **Hybrid** — job-centric flow stays; add standalone resume builder view |
| Builder source of truth | `profiles.profile_data` (master resume). Zero schema changes; provenance + pending suggestions keep working |
| Workspace navigation | **Non-linear panels** in Job Hub (Match Score / Keywords / Gap Analysis / Changes) + always-visible resume preview. Linear stepper survives only for first-run Q&A |
| Scoring | **Live re-score** on every accept/decline/edit via deterministic `lib/scoring/ats-scorer.ts` (no AI cost) |
| Preview rendering | `@react-pdf/renderer` `<PDFViewer>` with the existing export template — preview = final export, no renderer drift |
| Design Mode | **Full Teal-style Designer** — Presentation / Sections / Settings / Advanced (fonts, alignments, margins, section order/rename, experience & education layout variants, font sizes, entry/content spacing). **No template library** — one HireIQ default look; all variation via Designer controls. **Theme = visual only** (color, shape, typography, spacing, layout chrome) — not content/JD. Theme drives the *same* PDF template via props (no HTML preview fork). **Storage: master + per-job override** — default theme on profile; Job Hub can override for that tailored resume/PDF. **Responsive:** builder chrome + controls must work on mobile and web (stacked panels on small screens; preview still usable). |

### B. Job tracker

- Kanban board (drag cards between status columns, counts per column) **+ list toggle**
- Built on the Task 107 `applications` + `application_events` migration (spec §4.1)

### C. Email integration

- **Gmail read-only OAuth scan** — AI matches recruiter emails to tracked jobs, infers status changes (applied confirmed / interview / rejection / offer), high-confidence auto-links, medium/low ask user to confirm (spec Phase 2)
- **Forward-to-save address** — unique per-user address; forwarded postings are parsed into the tracker
- No send-from-HireIQ capability

### D. Chrome extension

| Decision | Choice |
|----------|--------|
| Phasing | Save-to-tracker → autofill → auto-apply (each phase independently usable) |
| Execution model | **Hybrid queue** — extension fills forms on the user's screen, user batch-reviews, submits while watching. No server-side Playwright bot, no stored job-board credentials |
| Unknown fields | **Ask every time** — no answer bank, no persistence of screening answers |
| Board support | Adapters for Greenhouse / Lever / Ashby / Workday first (reuses `lib/jobs/url-detect.ts` knowledge) + generic fallback engine that attempts everything. LinkedIn/Indeed: save-to-tracker only |
| Structure | `extension/` folder in this repo (monorepo), Manifest V3 + TypeScript + CRXJS, shares `types/` |
| Auth | One-click token handshake from dashboard, stored in `chrome.storage` |
| Resume upload in forms | The job's approved tailored PDF; fallback to primary resume |

---

## Data flows

### A1. Standalone resume builder (new)

```
components/profile/* editors (existing)
    → PATCH profile_data (existing route)
    → NEW right pane: PDFViewer rendering ProfileData via lib/export template
    → Design Mode edits profiles.resume_theme (master visual theme)
    → save on edit (same persistence as profile workspace)
```

### A1b. Theme inheritance (master + per-job)

```
profiles.resume_theme          ← master default (color, font, shape, spacing, alignments…)
tailored_resumes.theme_override ← optional per-job visual overrides (sparse/partial)
PDF render = merge(master, override) → same @react-pdf/renderer template
```

### A2. Job Hub workspace (rebuilt)

```
Job Hub (existing route)
    → NEW left rail: Score | Keywords | Gap Analysis | Changes panels
    → right: PDFViewer of tailored_resumes.structured_data (post-decision merge)
    → accept/decline/edit → app/api/tailor/[id]/decisions (existing)
    → NEW app/api/tailor/[id]/score → lib/scoring/ats-scorer.ts → live score header update
    → export gate unchanged (pending changes block export)
```

### B. Tracker

```
Task 107 migration: applications + application_events (additive; jobs table untouched until cutover)
    → components/jobs/TrackerBoard.tsx (Kanban, drag → status PATCH → event row)
    → components/jobs/TrackerList.tsx (existing list restyled, toggle with board)
```

### C1. Gmail scan (spec Phase 2)

```
Gmail OAuth readonly → daily scan (Edge Function / pg_cron — not yet set up)
    → Claude matches email → tracked job, infers status + confidence
    → high: auto-update + event row · medium/low: notification → user confirms
```

### C2. Forward-to-save

```
inbound email webhook (e.g. Supabase Edge Function + inbound email service)
    → per-user address token → parse posting (existing jobs/analyze pipeline) → tracker
```

### D. Extension

```
Phase 1: content script reads job page → POST /api/jobs (token auth) → tracker card
Phase 2: board adapters (GH/Lever/Ashby/Workday) map profile_data → form fields; generic fallback for unknown boards
Phase 3: fill → review queue in extension popup → user approves → submits visible tab
    → unknown field → inline prompt to user (ask every time, no bank)
    → resume field → approved tailored PDF for that job
```

---

## Teal UI recon (2026-08-02) — Playwright MCP

Screenshots: Playwright MCP output (`teal-designer*.png`, `teal-analyzer.png`, `teal-job-matcher.png`, `teal-job-tracker*.png`).

### Builder chrome (validates A)

Top tabs (non-linear): **Content Editor | Designer | Analyzer | Job Matcher | Cover Letter**
Split pane: left = active tool · right = **live resume preview** (always visible in Designer; Content Editor also shows preview).

| Tab | What it shows |
|-----|----------------|
| Content Editor | Accordion sections (Contact, Title, Summary, Experience…) with **per-company / per-bullet include checkboxes** — toggles what appears on the preview |
| Designer | Full Design Mode (see below) — this was underspecified in locked decisions |
| Analyzer | Circular **Overall Score** (e.g. 65%) + issue buckets: Resume Structure / Measurable Results / Keyword Usage + issue count badge on tab |
| Job Matcher | Selected job header + circular **Match Score** + keyword groups (Hard Skills / Soft Skills / Other) with matched counts; "Write Bullet" / Apply CTAs |

### Designer / Design Mode (PRIORITY FINDING)

Four sub-tabs. Live preview updates immediately when any control changes.

#### 1. Presentation
- **My Templates** — current template thumbnail + "Browse Template Library"
- **Styling** — Font (e.g. Poppins), Line Height %, List Line Height %, Accent Color swatches + picker, Date Format (Numbers MM/YYYY)
- **Alignments & Layouts** (visual mini-previews, not just labels):
  - Header Alignment → Left / Center / Right
  - Date Alignment → Left / Right
  - Location Alignment → Left / Right
  - Skills Layout → Comma Separated / Comma Separated List / Columns
- **Page Setup** — Paper Size (Letter), Left & Right Margins (in), Top & Bottom Margins (in)

#### 2. Sections
- **Section Order & Naming** — drag handles to reorder: Target Title → Professional Summary → Work Experience → Education → Certifications → Projects → Skills (rename per section)

#### 3. Settings
- **Work Experience Settings**
  - Show Locations By → Company / Position / None
  - Show Work Experience By → Company / Position
  - Show Dates By → Company / Position / Both
- **Education Settings**
  - Show Education By → Institution / Degree
  - Layout → Stacked / Inline

#### 4. Advanced
- **Font Size** — Name (e.g. 26) + Body (e.g. 10), each with slider
- **Entry Spacing** — per section type (Company, Position, Education, Certification, Projects, Skills, Awards, Activities, Publications)
- **Content Spacing** — Heading / Subheading / Body / List Item

**Implication for HireIQ:** Locked decision A said "PDFViewer with existing export template" and rejected dual renderers. Teal's Designer is a full **resume theme engine** (layout + typography + spacing + section order). That is a new workstream — not covered by Tasks 110–112. Needs an explicit go / no-go before we build it.

### Job Tracker (amends B slightly)

- Tabs: **Jobs | People | Companies**
- Status pipeline chips with counts: **BOOKMARKED → APPLYING → APPLIED → INTERVIEWING → NEGOTIATING → ACCEPTED**
- Default view = **Table** (Job Position, Company, Salary, Location, Status, Date Saved, Deadline, Date Applied, Follow up, Excitement stars)
- Toggle: **Table | Board** (Kanban columns matching the same statuses)
- Our locked "Kanban + list toggle" matches; Teal defaults to **table first**, board second. Status set is richer than HireIQ's current `application_status` (adds Bookmarked / Applying / Negotiating).

### Recon amendments vs locked decisions

| Locked | Teal reality | Action |
|--------|--------------|--------|
| Panels: Score / Keywords / Gaps / Changes | Tabs: Analyzer (structure score) + Job Matcher (JD match) are separate | Keep HireIQ hybrid panels, but mirror Teal's **circular score + keyword groups** visual language |
| Preview = fixed export template | Designer is a deep theme/layout system | **LOCKED** — full Teal-style Designer + responsive mobile/web chrome |
| Kanban + list | Table default + Board toggle; 6 statuses | Prefer **table-first** like Teal; expand status enum when Task 107 lands |
| Per-bullet include/exclude in editor | Content Editor checkboxes drive preview | Add to Task 112 / builder — strong UX win, not previously locked |

---

## Dependencies & risks

- **Task 107** blocks Kanban/table tracker (B)
- **Design Mode is large** — theme JSON + PDF template params + responsive chrome; ship after or alongside Task 112 (builder). Analysis workspace (110–111) can land first with a default theme.
- **Edge Functions + pg_cron not set up** — required for Gmail daily scan (C1) and forward-to-save (C2)
- **Google OAuth verification** — Gmail readonly scope requires app verification for production use
- **LinkedIn/Indeed ToS** — no automation beyond save-to-tracker; ban risk documented and accepted
- **Two renderers avoided** — PDFViewer everywhere; Design Mode must drive the *same* `@react-pdf/renderer` template via theme props (no HTML preview fork)

---

## 2026-08-03 grill lock — Teal chrome + HireIQ master (amends A/B)

Interview locked (questions 1–8). **Copy Teal structure/UX; HireIQ theme (color, type, spacing).** Do not invent a third IA.

### Locked choices

| # | Topic | Choice |
|---|--------|--------|
| 1 | Uncheck bullet | **Per-job only** — master keeps everything; provenance unchanged |
| 2 | Tailor stepper | **Kill** — tracker + Job Matcher replace it |
| 3 | Job drawer MVP | **Job Info · Notes · Resumes · Email · Templates**; Contacts + Check List stubbed/hidden |
| 4 | Builder tabs | **All five:** Content Editor · Designer · Analyzer · Job Matcher · Cover Letter |
| 5 | Statuses | Teal set + Rejected: `bookmarked` · `applying` · `applied` · `interviewing` · `negotiating` · `offer` · `accepted` · `rejected`; migrate `not_applied` → `bookmarked` |
| 6 | Home | Teal-style **Home tiles** at `/dashboard`; nav: Home · Resume Builder · Job Tracker; Alerts → account menu |
| 7 | Inclusion storage | `tailored_resumes.inclusion` JSONB (bullet/section/skill ids); missing = all included |
| 8 | Job detail | **Drawer primary**; `/dashboard/jobs/[id]` → tracker with drawer open; Job Matcher via `?jobId=` |

### Product model (HireIQ twist)

```
Master = profiles.profile_data (+ provenance from parse / Q&A / tailor / GitHub)
    → Content Editor edits master
    → Job Matcher attaches a job → inclusion map on tailored_resumes
    → Preview/export for job = master filtered by inclusion (+ theme merge)
    → Gap Q&A answers write into master with provenance (not a separate resume doc)
```

### IA / routes

| Route | Role |
|-------|------|
| `/dashboard` | Home tiles (Resume Builder, Job Tracker, Extension soon) |
| `/dashboard/builder` (or `/dashboard/profile`) | Master Resume Builder — 5 tabs |
| `/dashboard/tracker` | Job Tracker — Table default \| Board; status chips; Add Job |
| `/dashboard/tracker?jobId=` | Same + detail drawer open |
| `/dashboard/jobs/[id]` | Redirect → tracker?jobId= |
| `/dashboard/tailor*` | Redirect → tracker or builder Job Matcher |

### Build order (recommended)

1. **IA shell** — Home tiles, nav, redirects; kill Tailor from primary nav  
2. **Status migration 011** — expand enum + backfill  
3. **Tracker Teal UI** — real table columns + Board polish + status chips  
4. **Job drawer** — Job Info / Notes / Resumes / Email / Templates  
5. **Builder chrome** — 5-tab bar; Content Editor checkboxes (master view = all on; Job Matcher = per-job inclusion)  
6. **Job Matcher panel** — attach job, score, keywords, inclusion → tailored row  
7. **Analyzer + Cover Letter** tabs wired to existing libs  
8. Extension tile = placeholder until Task 116

### Explicitly still rejected

- Multi-resume document library like Teal (master remains single source of truth)
- Send-email from HireIQ (templates + manual email log only until Gmail Phase 2)
- Full Contacts / Check List / People / Companies (later)

---

## Explicitly rejected (original)

- Resume-centric re-architecture (full Teal clone) — **amended 2026-08-03:** Teal *chrome* yes; multi-resume docs still no
- `saved_resumes` table / editing uploaded resume snapshots
- Server-side autonomous Playwright auto-apply
- Answer bank / screening-answer persistence (user prefers being asked every time)
- Send-email capability
- LinkedIn Easy Apply automation
