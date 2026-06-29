# 11 — Email Tracking (Masked Inbox)

> v1 ships email tracking via our own masked addresses — **not** Gmail read.
> Decision: Q32. Research: `12-sprout-research.md`. Last updated: 2026-06-14

## Why masked inbox (not Gmail)

Sprout uses `@whisperpost.io` addresses. They do **not** request Gmail read access from users.

| Approach | Pros | Cons |
|----------|------|------|
| **Masked inbox (chosen)** | No Google CASA audit; works with manual apply in v1; same infra for v2 auto-apply verification | User must use masked email when applying |
| Gmail read | Zero behavior change for user | Restricted scope; yearly security assessment; privacy friction |

## How it works

```
1. On signup (or first job), generate:  {username}@{our-domain}
2. Store mapping: masked_email → user_id, forward_to → user.real_email
3. User copies masked email into employer application form
4. Employer emails land at our inbound endpoint
5. We parse → store event → forward to user's real inbox
6. Job timeline updates with parsed status hints
```

## User-facing UI

### Profile or settings
- "Your application email: `sharif.d7w@mail.hireiq.io`"
- Copy button
- Short explanation: "Use this when applying so we can track confirmations and interviews. Emails still forward to you."

### Per-job sidebar
- Same masked email (one per user, not per job — simpler v1)
- Optional: per-job alias later (`sharif.d7w+job123@…`) for attribution

### Timeline events
- "Application confirmation received from Ascension"
- "Interview invite detected"
- User can confirm/dismiss suggested status change

## Inbound email processing

```
POST /api/webhooks/inbound-email
  → Verify signature (provider-specific)
  → Lookup masked_email → user_id
  → Parse:
      - from domain → match to job company (fuzzy)
      - subject/body keywords → status hint
  → INSERT job_email_events
  → Forward raw email to forward_to (SMTP or provider relay)
  → Optionally INSERT notification
  → UPDATE jobs.application_status (suggest only, or auto if high confidence)
```

### Parse heuristics (v1 — simple)
| Pattern | Suggested status |
|---------|------------------|
| "thank you for applying" | `applied` |
| "interview" / "schedule" | `interview` |
| "unfortunately" / "not moving forward" | `rejected` |
| "offer" | `offer` |

Phase 2 of email parsing: small LLM classify on subject+snippet (cheap model).

## Data model

```sql
-- One masked address per user (v1)
ALTER TABLE profiles ADD COLUMN masked_email TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN email_forward_to TEXT; -- defaults to profiles.email

CREATE TABLE job_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,  -- null if unmatched
  masked_email TEXT NOT NULL,
  from_address TEXT,
  subject TEXT,
  body_preview TEXT,
  raw_payload JSONB,           -- provider-specific; consider retention policy
  parsed_status TEXT,          -- suggested application status
  confidence NUMERIC,          -- 0-1
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: user_id = auth.uid()
```

## Provider options (O1 — decide before build)

| Provider | Inbound | Forwarding | Notes |
|----------|---------|------------|-------|
| **Resend** | Inbound routes | Send API | Modern DX; check inbound availability |
| **Postmark** | Inbound webhook | Built-in | Solid; per-address cost |
| **Mailgun** | Routes | Forward | Mature; good for `*@domain` catch-all |
| **Cloudflare Email Routing** | Workers | Forward | Cheap; need worker for parse logic |

**Recommendation:** Mailgun or Postmark catch-all on `applications.hireiq.io` (or subdomain) with webhook to our API.

## Security & privacy

- Masked emails are unique per user; never expose other users' addresses.
- Raw email payload: retention policy (e.g. 90 days) — document in privacy policy.
- Webhook endpoint: verify signatures; rate limit.
- Forwarded emails: user's real inbox is the source of truth for replies (like Sprout).

## v2 extension (auto-apply)

Same masked inbox receives:
- Account verification codes
- Magic login links
- Portal "complete your application" emails

Agent reads codes from `job_email_events` or a short-lived internal queue — **not** user's Gmail.

## Application credentials (Q31 — v2 prep)

When auto-apply creates a portal account:
```sql
CREATE TABLE application_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  portal_email TEXT NOT NULL,      -- masked email used
  portal_password_encrypted TEXT,  -- encrypt at rest
  portal_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

v1: schema optional; UI shows masked email only. Full credentials card when auto-apply ships.

## Google sign-in relationship (Q29)

Google OAuth at signup = **identity only** (name, email, avatar). Completely separate from application email tracking. No incremental Gmail scope needed for masked inbox approach.
