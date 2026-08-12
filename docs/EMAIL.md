# Masked inbound email (Resend)

**Status:** Task 139 shipped + production domain live · migration **015** applied  
**Production app:** https://hireiq.kingsharif.com  
**Receiving domain:** `mail.kingsharif.com` (Resend Receiving verified)

## Product role (aligned with DECISIONS 2026-08-12)

| Path | Role |
|------|------|
| **Task 114 — Gmail sync** | **MVP** employer-status tracking for Google-connected users (default on / opt-out) |
| **Task 139 — Masked apply** | Apply address + inbound log + optional forward — live now; paste-on-apply, email/password users, Gmail opted out |
| **Task 140 — Mask reply-relay** | **v2** deepen 139: clearer prefs + reply path (user ↔ HireIQ ↔ employer) |

Agents: do not delete 139 while building 114 — both feed `email_log` / All outreach.

## What it does

HireIQ gives each user one **application email** (e.g. `sharif.abc123@mail.kingsharif.com`).  
They paste it (or extension autofills later) on applications. Employer mail → Resend → webhook → **All outreach** / job **Email** (when company matched). Optional forward to their real inbox via `RESEND_FORWARD_FROM`.

## Data flow

```
User creates address (Profile → Personal)
  → profiles.masked_email UNIQUE

Employer sends mail to masked address
  → Resend Receiving (MX on mail.kingsharif.com)
  → POST /api/webhooks/resend/inbound  (Svix verify)
  → fetch body via Resend Receiving API
  → inbound_email_events (canonical store)
  → match open applications by company / from-domain
  → append applications.email_log (source: masked) + email_linked event
  → notification (email_status)
  → optional Resend Send forward (RESEND_FORWARD_FROM)
```

## Env

**Local (`.env.local`)** — keep `NEXT_PUBLIC_APP_URL=http://localhost:3000`

```env
MASKED_EMAIL_DOMAIN=mail.kingsharif.com   # server-only; needed to mint addresses
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...
# Optional forward:
# RESEND_FORWARD_FROM=HireIQ <noreply@mail.kingsharif.com>
SUPABASE_SERVICE_ROLE_KEY=...
```

**Vercel (production + preview)** — secrets only; no TEST_USER / OIDC copies:

| Var | Notes |
|-----|--------|
| `MASKED_EMAIL_DOMAIN` | Sensitive server env (not `NEXT_PUBLIC_`) |
| `RESEND_API_KEY` | Sensitive |
| `RESEND_WEBHOOK_SECRET` | Sensitive |
| `NEXT_PUBLIC_APP_URL` | `https://hireiq.kingsharif.com` |
| + Supabase / Anthropic / GitHub | Same as app |

## Production webhook

```text
https://hireiq.kingsharif.com/api/webhooks/resend/inbound
```

Event: `email.received`. After changing the secret on Vercel → **redeploy**.

## Supabase Auth URLs (both)

- `http://localhost:3000/auth/callback`
- `https://hireiq.kingsharif.com/auth/callback`  
Site URL: prefer prod `https://hireiq.kingsharif.com` (localhost still listed in redirects).

## App surfaces

| Place | Behavior |
|-------|----------|
| Profile → Personal → Application email | Create / copy / forward toggle |
| Applications → All outreach | Matched inbound (source HireIQ) |
| Job → Email tab | Same when matched |
| Alerts | `email_status` |

## Schema (migration 015)

- `profiles.masked_email`, `email_forward_to`, `email_forward_enabled`
- `inbound_email_events` + RLS SELECT for owner; webhook inserts via service role  

File: `docs/supabase/migrations/015_masked_inbound_email.sql`

## Smoke checklist (prod)

1. https://hireiq.kingsharif.com → Profile → Create application email → copy  
2. Send test from Gmail to that address  
3. Resend → Receiving shows it  
4. HireIQ notification + All outreach / job Email (if company match)  
5. Optional: set `RESEND_FORWARD_FROM` and confirm forward copy  

## Security

- Verify Svix signatures  
- Never expose service role / Resend keys to the browser  
- `MASKED_EMAIL_DOMAIN` is server-only; the domain still appears in the user’s copied address  

## Related

- [DECISIONS.md](./DECISIONS.md) — Gmail MVP + mask v2 (2026-08-12); masked inbound (2026-08-10)  
- [AUTH.md](./AUTH.md) · Task 114 · Task 140  
- Legacy research: [legacy/planning/11-email-tracking.md](./legacy/planning/11-email-tracking.md)
