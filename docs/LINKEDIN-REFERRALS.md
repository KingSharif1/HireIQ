# LinkedIn referrals & networking (v2) — design

**Status:** design only, not started. **Owner's words:** a way to add referees from LinkedIn, and to network for referrals
and references. This is the last greenfield pillar; everything else (tailor, credits, apply, email) is code-complete.

Reference for the data shape: Sprout ships `/linkedin-outreach/*` endpoints and `linkedin_outreach_contacts` /
`linkedin_outreach_events` tables — i.e. outbound referral/networking is a first-class, per-contact, per-job state machine,
not a bolt-on.

---

## 1. Goal

Turn the user's LinkedIn network into referrals and warm intros:

1. Ingest the user's 1st-degree connections.
2. Map connections → the companies the user is targeting (who works at the places you're applying to).
3. Rank "referral strength" per (connection, company) pair.
4. Draft the ask (referral request / warm intro) with Claude, in the user's voice.
5. Track the ask → referred → replied funnel, linked to the application/timeline.

**Honesty gate (non-negotiable, same as auto-apply):** messages are *drafts only*. Never auto-DM. The user reviews, edits,
and sends on LinkedIn themselves (or later via a messaging integration that still requires explicit per-message confirm).

---

## 2. Ingestion — the LinkedIn API reality (decision)

LinkedIn does **not** expose your connection list through a usable OAuth scope anymore (the Connections API is
effectively closed; `r_liteprofile` gives your own profile, not your graph). Two practical paths, not either/or:

- **A. CSV import (primary, ship first).** LinkedIn → Settings → "Get a copy of your data" → *Connections* → `Connections.csv`
  (`First Name`, `Last Name`, `Company`, `Position`, `Connected On`, `Email Address`, `URL`). Import like the existing
  resume-upload / GitHub sync, parse with a small CSV module, store normalized rows. Zero API risk, works today.
- **B. OAuth (optional, later).** Sign In with LinkedIn (`openid profile email`) to verify identity + pull your own profile
  (headline, current role) — useful for the *candidate* context in draft prompts, not for the connection graph.

Recommendation: build **A** now; treat **B** as a profile-context enhancement behind the same OAuth pattern as
`google_connections` / `github_connections`.

---

## 3. Data model (migration sketch)

Mirror the existing `github_connections` / `google_connections` + `application_events` patterns.

```sql
-- 029_linkedin_referrals.sql (sketch)
CREATE TABLE IF NOT EXISTS linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  linkedin_url TEXT,                 -- canonical profile URL (unique per user)
  first_name TEXT, last_name TEXT,
  company TEXT,                      -- current company from the CSV
  position TEXT,
  email TEXT,                        -- only if present in the export
  connected_on DATE,
  source TEXT NOT NULL DEFAULT 'csv' CHECK (source IN ('csv','oauth')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, linkedin_url)
);

CREATE TABLE IF NOT EXISTS referral_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES linkedin_connections(id) ON DELETE CASCADE,
  target_company TEXT,               -- company the user is targeting
  warmth TEXT,                       -- 'strong' | 'warm' | 'cold' | 'unknown'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES linkedin_connections(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'drafting'
    CHECK (stage IN ('drafting','intro_asked','referred','replied','declined','no_response')),
  message_draft TEXT,                -- Claude draft; never sent by us
  referral_strength REAL,            -- 0..1 match score
  asked_at TIMESTAMPTZ, replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- referral_events: timeline, mirrors application_events (stage changes, notes).
```

RLS identical to `github_connections`: authenticated read/write own rows, `service_role` full.

---

## 4. Pipeline

```
Connections.csv
      │  parse + dedupe on linkedin_url
      ▼
linkedin_connections  ──►  referral_contacts (map: who works where)
      │
      │  match target company ↔ connection.company (Claude + fuzzy)
      ▼
referral_outreach (per job)  ──►  rank referral_strength
      │
      │  Claude drafts the ask (candidate profile + connection context + job)
      ▼
message_draft  ──►  user reviews/edits  ──►  sends on LinkedIn  ──►  stage → asked
      │
      ▼
referral_events  ──►  application timeline (referred / replied)
```

- **Matching** is the same `job-relevance` idea applied to people: token match of connection.company vs job company,
  then Claude for the fuzzy "ex-<company>", "works in same team", "friend of friend" signals. Store a `referral_strength`
  0..1 and a short `reason` so the user knows why a contact was surfaced.
- **Drafting** reuses `lib/ai` + `usageMetadata` (feature `referral_draft`, strong tier). Prompt constraints mirror the
  tailor prompt: user's voice, no AI-tell diction, never invent the relationship.
- **Stage machine** is a pure `lib/referrals/stages.ts` (mirror `lib/apply/types` apply statuses): legal transitions,
  terminal states, `drafting → intro_asked → (referred | declined | no_response | replied)`.

---

## 5. Reuse (what already exists)

- OAuth/connect UX: `github_connections` / `google_connections` flows (`lib/github`, `lib/google`).
- Timeline/events: `application_events` + `ApplicationsTracker`.
- AI + metering: `lib/ai/usage` (`ai_usage_events`, `usageMetadata`), model tiers.
- Honesty gate + process-log pattern from tailor/apply runs.
- Outreach inbox surface: `components/jobs/OutreachList.tsx` (today it's inbound email; referrals become a second feed).

---

## 6. Build order

1. **Migration 029** + `lib/referrals/csv.ts` (parse Connections.csv) + `lib/referrals/stages.ts` (pure, testable).
2. Import UI + `linkedin_connections` list (dedupe, warmth tags).
3. **Match + rank** (`lib/referrals/match.ts`, pure) → "who can refer you at <company>".
4. **Draft** (Claude) → review/approve UI → `referral_outreach` row + events.
5. Timeline integration + a "Referrals" tab on the job detail.
6. (Later) LinkedIn OAuth for own-profile context.

---

## 7. Blocked on King

- Whether to ship CSV import first (recommended) or wait for a LinkedIn API path.
- LinkedIn export includes only *some* emails — confirm we should still store the URL/name/company and draft against the
  connection's *profile*, not email.
- The honesty boundary: confirm "drafts only, user sends" (assumed) and that no message is ever sent by HireIQ.

---

## 8. Open questions

- Warm-intro vs direct referral ask: two message templates, or one flow with a branch?
- Should referrals be scoped per *job* (referral_outreach.job_id) or per *company* (contact-level)? Sketch uses both.
- Do we surface "reference request" (for the interview stage) separately from "referral" (for the application stage)?
