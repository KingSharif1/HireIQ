# Design — HireIQ IA reset (Teal × Sprout)

**Status:** Superseded in part by 2026-08-09 Profile unify grill — see `docs/DECISIONS.md`  
**Supersedes:** conflating Profile with Teal Resume Builder chrome; job detail as side drawer  
**References:** Teal HQ job tracker DOM; Sprout Profile + job hub; `docs/DECISIONS.md` (2026-08-04, 2026-08-09)

---

## Product north star

Simple loop: **upload resume → tailor for a job → apply** — without paying for five tools. Master career truth stays updated so the next job doesn’t re-ask the same questions.

---

## Primary navigation

| Place | Where | Role |
|-------|--------|------|
| **Dashboard** | Primary nav | Calm hub: completeness, actions needed, CTAs (add job / tracker / builder) |
| **Applications** | Primary nav | Teal-style tracker (list default + Board toggle) |
| **Resume Builder** | Primary nav | Teal resume library: import, past job versions; master edits → Profile |
| **Profile** | Account / profile icon only | Unified master resume: Documents + content + pending updates |

Chrome extension is a product pillar but not a nav item.

---

## Profile (master resume)

1. **One page** — identity → Documents vault (keep forever) → pending accept/deny → section editors
2. Living structured master (experience, education, skills, URLs, etc.)
3. Master updates only via explicit accept (or empty-master seed from first parse)
4. Chrome autofill later reads Profile + the right document for the job

**Resume Builder ↔ Profile Documents:** same library, two doors (Decision: option A).
**Teal Builder tabs:** only on Applications → job Documents (not on Profile).

---

## Applications / Tracker (Teal-shaped)

- Statuses (full Teal set): `Bookmarked` · `Applying` · `Applied` · `Interviewing` · `Negotiating` · `Offer` · `Accepted` · `Rejected`
- Default view: **table/list**; toggle to **Board**
- Clicking a job opens a **full page** (not a side drawer)

### Job detail — full page

**Header (always):** status · match score · company/title · primary actions (tailor, open posting)

**Tabs (v1 ship):**

| Tab | Content |
|-----|---------|
| Overview | Score, status, quick actions, JD preview |
| Job description | Full JD + keywords/responsibilities + **View original** link |
| Documents | Preview / edit / create tailored resume **on this page** (not Profile) |
| Questions | Screening / tailor Q&A (save-to-master later) |
| Notes | Freeform notes |
| Activity | Timeline + email log combined (Sprout-style) |

Right rail (desktop): job facts (comp, level, work type, location) + recent activity.

**Deferred:** Contacts, Check List; Questions → master accept flow.

**Tailor entry:** both job detail (daily path) and Resume Builder (library / import / blank) — same engine.

---

## Master update rules (from job Q&A / tailor)

1. Classify answer: enrich **existing** entry vs **brand-new** entity; if unclear, ask user.
2. Mark as newly added; user can accept or deny.
3. Soft-keep after 24h **only** for enrichments to existing entries; brand-new master rows need explicit accept.
4. User can always remove later.

---

## Chrome extension roadmap

1. **First:** Save job → Applications tracker (JD, link, company, status)
2. **Next (one feature):** Autofill from Professional Profile + attach tailored resume + **submit** after user review; multi-page aware (login, account, question steps)
3. **Later polish:** Masked-email portal accounts + show credentials on job detail when needed (Sprout pattern). **Never** reset employer passwords we don’t own.

---

## Build order

1. **Applications** — Teal tracker + full-page job detail; remove drawer as primary UX  
2. Profile (Documents + Professional Profile)  
3. Resume Builder library  
4. Chrome save-to-tracker → autofill+submit  

---

## Routes (shell + Applications)

| Path | Role |
|------|------|
| `/dashboard` | Dashboard hub |
| `/dashboard/tracker` | Applications list / board |
| `/dashboard/tracker/[jobId]` | Full-page job detail |
| `/dashboard/builder` | Resume Builder library (import / list / past versions) |
| `/dashboard/builder/master` | Redirect → Profile (or tracker Documents if `jobId`) |
| `/dashboard/builder?tab=` / `jobId` | Redirect → Profile or tracker Documents |
| `/dashboard/profile` | Unified master resume (account icon only) |
| `/dashboard/profile/documents` | Redirect → `/profile?section=resumes` |
| `/dashboard/profile/professional` | Redirect → `/profile` |
| `/dashboard/profile?section=` | Deep-link document tab or master section |
| `/dashboard/jobs/[id]` | Redirect → tracker/[id] |
| `/dashboard/tracker?jobId=` | Redirect → tracker/[jobId] |
| `/dashboard/tracker/[jobId]?tab=documents` | Job detail Documents (Teal tools) |

---

## Visual rule

Copy Teal / Sprout **structure and density**; HireIQ **colors, type, spacing tokens** — not a Teal skin dump, not a third invented IA.
