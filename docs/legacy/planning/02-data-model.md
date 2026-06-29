# 02 — Data Model

## Principle

**Profile is the master record.** Tailoring reads from it. Uploaded resumes seed it once;
tailored resumes are immutable, job-specific snapshots derived from it.

## Entities

```
profiles
  ├─ id, email, first_name, last_name, username, target_role, years_experience
  └─ profile_data: JSONB   ← THE MASTER (sectioned career data + provenance sidecar)

resumes              ← uploaded base files + their parsed structured_data (seed source)
  └─ structured_data: JSONB

tailored_resumes     ← immutable snapshots, one per tailor run
  ├─ base_resume_id → resumes.id
  ├─ job_id → jobs.id
  ├─ structured_data: JSONB   (frozen snapshot)
  ├─ changes: JSONB           (diff vs base)
  ├─ match_score, tailored_score
  └─ created_at

jobs                 ← job descriptions + extracted_data + status fields (planned)
  ├─ application_status, tailoring_status (planned)
  └─ updated_at (planned)

tailored_resumes     ← immutable snapshots, one row per version per tailor run
  ├─ base_resume_id → resumes.id
  ├─ job_id → jobs.id
  ├─ version INT (planned) — 1, 2, 3 per job
  ├─ structured_data: JSONB   (frozen snapshot)
  ├─ changes: JSONB           (diff vs master — powers Q34 change summary)
  ├─ gap_answers: JSONB (planned) — questions + user answers for this run
  ├─ match_score, tailored_score
  ├─ user_edited: BOOLEAN (planned)
  └─ created_at

job_email_events     ← NEW (Phase 5): inbound masked-email events
application_credentials ← NEW (v2 prep): portal login per job
masked_email on profiles ← NEW (Phase 5): one alias per user

notifications        ← NEW (Phase 4): pending suggestions, tailor complete, email status
```

> Note on naming: the master career data currently lives in `profiles.profile_data`
> (added via migration `002_profile_data` / Supabase migration `profile_data`). The
> `ProfileData` shape is defined in `types/index.ts`.

## `profile_data` shape (current + planned additions)

Current (`ProfileData` in `types/index.ts`): `personal`, `summary`, `urls`, `experience`,
`volunteering`, `projects`, `education`, `skills`, `certifications`, `achievements`,
`additional`, `additionalDocuments`, `attachments`.

### Planned addition — provenance sidecar (Q11)

Bullets stay plain strings (so parser/scorer/exports are untouched). A **parallel map**
keyed by a stable bullet id carries origin + history:

```ts
interface ProvenanceEvent {
  type: 'added_from_tailor' | 'edited' | 'accepted'
  date: string                 // ISO
  tailoredResumeId?: string    // for added_from_tailor
  jobLabel?: string            // e.g. "Senior PM @ Acme" (denormalized for hover)
}

interface ProvenanceEntry {
  origin: 'base' | 'tailor'
  sourceTailoredResumeId?: string
  history: ProvenanceEvent[]   // append-only timeline (Q10b)
}

// stored on ProfileData:
provenance: Record<string /* bulletId */, ProvenanceEntry>
```

Rules:
- **Append-only.** Every add/accept/edit pushes an event. History is never truncated (Q10b).
- **Tag conversion (Q10):** heavy edit flips `origin` display from "tailor" → "base" for
  coloring, but the `history` (including the original `added_from_tailor`) stays.
- Bullets need **stable ids**. Sidecar is keyed by them; generate on creation.

### Planned addition — pending suggestions (Q2, Q12)

Write-backs are **pending** until accepted. Stored so the UI can show section badges +
inline previews:

```ts
interface PendingSuggestion {
  id: string
  section: keyof ProfileData       // e.g. 'experience'
  targetEntryId?: string           // which experience/project to attach under
  proposedText: string             // the new bullet
  reason: string                   // "why we suggest this" message
  sourceTailoredResumeId: string
  jobLabel: string
  createdAt: string
}
// stored on ProfileData OR derived into notifications (see below)
pendingSuggestions: PendingSuggestion[]
```

On **Accept**: move text into the real section, create a `provenance` entry
(`origin: 'tailor'`, history seeded with `added_from_tailor`), remove the pending item.
On **Decline**: remove the pending item.

## Versions / history (Q9, Q9b)

- "Past resumes" = rows in `tailored_resumes`, each tied to its job, with a full frozen
  `structured_data` snapshot + `changes` diff + scores + date.
- **Base is editable**; tailored snapshots are **never** mutated by base edits.
- Write-backs link base → source tailored resume via `provenance.sourceTailoredResumeId`.

## Notifications (Q13) — Phase 4

Dedicated table (reusable beyond suggestions):

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,          -- 'suggestion' | 'job_match' | 'reminder' | ...
  title text not null,
  body text,
  link text,                   -- deep link (e.g. /dashboard/profile#experience)
  ref_id uuid,                 -- e.g. tailored_resume id or suggestion id
  read boolean default false,
  created_at timestamptz default now()
);
-- RLS: user_id = auth.uid()
```

- Sidebar shows **unread count** (the Sprout-style `99+` badge).
- Per-section badges in the profile come from **pending suggestions count for that section**
  (can be derived from `pendingSuggestions`, mirrored into a `notification` row for the
  global bell).

## Migrations applied so far

- `001_initial_schema` — base tables.
- `…split_full_name_to_first_last_add_username` — name columns.
- `profile_data` (Supabase) / `002_profile_data.sql` (local) — added `profiles.profile_data JSONB`.
- `004_notifications.sql` — **apply in Supabase** (Phase 4; not auto-linked to remote yet).

## Migrations planned

- `003` — provenance sidecar + pendingSuggestions are JSONB-internal (no DDL needed; shape
  change only).
- `004` — `notifications` table + RLS (Phase 4).
- `005` — job status columns + `tailored_resumes.version`, `user_edited`, `gap_answers` (Phase 5).
- `006` — `profiles.masked_email`, `email_forward_to`; `job_email_events` table (Phase 5).
- `007` — `application_credentials` (v2 prep; optional in v1 schema-only).

### `jobs` additions (Phase 5)

```sql
ALTER TABLE jobs ADD COLUMN application_status TEXT DEFAULT 'not_applied';
ALTER TABLE jobs ADD COLUMN tailoring_status TEXT DEFAULT 'not_started';
ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

Status enums documented in `08-v1-product-spec.md`.

### `tailored_resumes` additions (Phase 5)

```sql
ALTER TABLE tailored_resumes ADD COLUMN version INT DEFAULT 1;
ALTER TABLE tailored_resumes ADD COLUMN user_edited BOOLEAN DEFAULT false;
ALTER TABLE tailored_resumes ADD COLUMN gap_answers JSONB DEFAULT '[]';
-- Unique: (job_id, version) per user? Or allow separate resume/cover letter versions — see O4 in 08.
```

### Change summary contract (`changes` JSONB)

Already typed as `ResumeDiffChange[]`. Phase 2 engine must populate reliably:

```ts
interface ResumeDiffChange {
  section: string       // 'experience' | 'summary' | ...
  field: string         // 'bullets' | 'text' | ...
  expId?: string
  before: string | string[]
  after: string | string[]
  changeType: 'added' | 'changed' | 'removed' | 'reordered'  // planned
  reason?: string       // from tailoring_notes
}
```

UI (`ChangeSummary` component) groups by `changeType` for Q34.
