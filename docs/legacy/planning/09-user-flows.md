# 09 — User Flows & Data Flows

> Every major path: user action → UI → API → DB → response → UI.
> Last updated: 2026-06-14

## Flow map (v1)

```
Sign up / Log in
    → Onboarding (upload resume OR fill profile)
    → Profile (master, always editable)
    → Add job (paste JD)
    → Tailor (score → questions → generate)
    → Job detail (review docs, versions, diff, export)
    → Apply manually (masked email)
    → Email events update job timeline
    → Accept write-backs into profile (optional)
```

---

## 1. Sign up / Log in

**User:** creates account or signs in with Google.

```
User → /signup or /login
  → Supabase Auth (email/password or Google OAuth, basic scope)
  → Trigger: handle_new_user() → profiles row
  → Redirect → /dashboard
```

**Data:** `profiles.id` = `auth.users.id`. `profile_data` starts `{}`.

**Decision:** Q29 — no Gmail scope at signup.

---

## 2. Seed master profile (upload resume)

**User:** uploads PDF/DOCX in Profile → Documents → Resumes.

```
User selects file (max 3 uploads; oldest pruned — Q20)
  → POST /api/resume/parse
      → Extract text → AI parse → StructuredResume
      → INSERT resumes (file URL, structured_data, is_primary logic)
      → buildProfileSeedFromParse() → merge into profiles.profile_data
      → UPDATE profiles
  → UI: show original file preview (default) + toggle parsed data (Q22)
```

**On re-upload (Q21):**
```
Parse new file → diff vs current profile_data
  → Show "what's new" highlights
  → User reviews → accept merge (only new/changed sections)
```

**Data flow:**
- `resumes.structured_data` = parsed snapshot (historical)
- `profiles.profile_data` = master (grows via seed + user edits)

---

## 3. Edit master profile

**User:** edits sections in `/dashboard/profile`.

```
User edits section → local state in ProfileWorkspace
  → Save → PATCH profiles (profile_data + first_name/last_name)
  → Completeness + section badges recalculate client-side
```

**Downstream:** next tailor run reads updated `profile_data`. Existing tailored snapshots unchanged (Q9b). Jobs with existing tailored docs may show `stale` tailoring status.

---

## 4. Add job (bring your own)

**User:** pastes job description or link at `/dashboard/jobs` (becomes tracker).

```
User submits JD
  → POST /api/jobs/analyze (or save + analyze)
      → AI extract → JobExtractedData
      → INSERT jobs (description, extracted_data, company, title, …)
  → Redirect to job detail or tailor flow
```

**v1:** no job search. User provides all job text (Q27).

---

## 5. Tailor for a job

**User:** runs tailor from job detail or `/dashboard/tailor`.

### Step A — Confirm master profile
```
GET profile + jobs
  → resolveProfileData() / hasProfileContent()
  → UI: profile summary (not resume picker)
```

### Step B — Fit score
```
POST /api/tailor/score
  → getMasterResumeContext() → structured from profile_data
  → calculateATSScore(structured, job.extracted_data)
  → Return match_score breakdown
```

### Step C — Gap questions
```
POST /api/tailor/questions
  → Compare job requirements vs profile evidence
  → Return GapQuestion[] (honesty: ask, don't invent — Q6)
```

### Step D — Generate (Phase 2 engine)
```
User answers questions
  → POST /api/tailor/generate
      → Pass 1: generate tailored structured_data
      → Pass 2: critique (ATS % + human flags)
      → Loop if gate fails (max 2 retries — Q5)
      → Compute changes[] diff vs master
      → INSERT tailored_resumes (snapshot, changes, scores)
      → Queue pendingSuggestions for new evidence (Phase 3)
  → POST /api/tailor/cover-letter (parallel or sequential)
  → Redirect → job detail documents panel
```

**Data:**
- `tailored_resumes.structured_data` — frozen snapshot
- `tailored_resumes.changes` — diff for UI (Q34 change summary)
- `tailored_resumes.match_score` / `tailored_score`

---

## 6. Review documents (per job)

**User:** opens job → Documents tab.

```
GET job + tailored_resumes (ordered by version)
  → Main pane: Resume | Cover Letter tabs
  → Version selector (v1, v2, v3)
  → Change summary panel (added/changed/removed vs master)
  → Actions: Edit (creates user-edited flag), Regenerate (if under cap), Export
```

**Regenerate (Q34):**
```
User clicks Regenerate (shows "2/3 used")
  → Re-run tailor generate for same job
  → New tailored_resumes row (version++)
  → Previous versions remain viewable
```

**Export (Q26):**
```
User clicks Export PDF or DOCX
  → Render from structured_data template
  → AI/layout check: page count, overflow, section fit
  → Store pdf_url / docx_url on tailored_resumes row
  → Download
```

---

## 7. Apply manually + email tracking

**User:** applies on employer site using masked email.

```
Job detail → "Application email" card
  → Show user@ourdomain.hireiq.io (copy button)
  → User pastes into employer application form
  → Employer sends confirmation → our inbound webhook
      → Parse email (company, subject, status hints)
      → INSERT job_email_events
      → Forward full email to user's real inbox
      → Suggest application_status update on job
  → Timeline on job detail updates
```

See `11-email-tracking.md` for infra detail.

**v1:** user applies themselves. We do not submit forms (Q30 = v2).

---

## 8. Write-back suggestions

**User:** after tailoring, new bullets suggested for master profile.

```
Tailor run produces pendingSuggestions (Phase 3)
  → Notification created (Phase 4)
  → Profile section badge shows count
  → User opens section → inline preview + reason + Accept/Decline
  → Accept:
      → Bullet added to profile_data section
      → provenance[bulletId] seeded (origin: tailor, history[])
      → pendingSuggestion removed
  → Decline: remove pending only
```

---

## 9. Notifications

```
Sidebar badge = unread notifications count
  → Click → list → deep link to profile section or job
```

Types in v1: `suggestion`, `tailor_complete`, `email_status` (future: `job_match` v2).

---

## Entity relationship (runtime)

```
profiles.profile_data  ←── reads ──  tailor engine
        ↑                                    │
        │ write-back (accept)                │ snapshot
        │                                    ↓
        └──────── provenance ──────  tailored_resumes ──→ jobs
                                              │
                                              └── cover_letter, changes, scores

resumes (uploads) ──seed──→ profile_data
masked_emails ──forward──→ user real email
job_email_events ──timeline──→ jobs
```
