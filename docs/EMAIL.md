# Masked inbound email (Resend)

**Status:** Task 139 shipped + production domain live · migration **015** applied  
**Production app:** https://hireiq.kingsharif.com  
**Receiving domain:** `mail.kingsharif.com` (Resend Receiving verified)

## Product role (aligned with DECISIONS 2026-08-12)

| Path | Role |
|------|------|
| **Task 114 — Gmail sync** | **MVP** employer-status tracking for Google-connected users (default on / opt-out) |
| **Task 139 — Masked apply** | Apply address + inbound log + optional forward — live now; paste-on-apply, email/password users, Gmail opted out |
| **Task 140 — Mask reply-relay** | **v2** deepen 139: reply from job Email tab via masked address (first slice shipped); fuller prefs + unmatched-thread reply still open |

Agents: do not delete 139 while building 114 — both feed `email_log` / All outreach.

## What it does

HireIQ gives each user one **application email** (e.g. `sharif.abc123@mail.kingsharif.com`).  
They paste it (or extension autofills later) on applications. Employer mail → Resend → webhook → **All outreach** / job **Email** (when company matched). Optional forward to their real inbox via `RESEND_FORWARD_FROM`.

## Data flow

```
User creates address (Settings → Application email)
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

User creates save address (Settings → Save jobs by email)
  → profiles.forward_save_email UNIQUE
User forwards a posting to that address
  → same inbound webhook
  → extract job URL (ATS preferred) → saveJobFromUrl → tracker + notification
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
| Profile → Personal → **Gmail tracking** | Connect Google (gmail.readonly); sync toggle default on |
| Profile → Personal → Application email | Create / copy / forward toggle (Task 139) |
| Job → Email tab → **Reply via HireIQ** | Sends from masked address to employer (Task 140) |
| Settings → Integrations → **Save jobs by email** | Forward a posting to `save.*@mail.kingsharif.com` → tracker (Task 115) |
| Applications → All outreach | Matched inbound (source HireIQ / later Gmail) |
| Job → Email tab | Same when matched |
| Alerts | `email_status` |

## Schema

**015** — masked inbound: `profiles.masked_email`, `email_forward_*`, `inbound_email_events`  
**016** — Gmail connect: `profiles.gmail_sync_enabled` (default true), `google_connections` (refresh token + history_id)  
**017** — `inbound_email_events.provider` + `provider_message_id` (unique per provider)  
**020** — `profiles.forward_save_email` (Task 115)

## Env (Gmail connect)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Redirect: ${NEXT_PUBLIC_APP_URL}/api/google/callback
# Optional batch cron auth:
# CRON_SECRET=
```

Separate from Supabase “Sign in with Google” — this flow requests `gmail.readonly` + offline refresh.

## Sync

| Trigger | Route |
|---------|--------|
| Profile → Sync now | `POST /api/google/sync` (session) |
| Cron / ops | `GET|POST /api/cron/gmail-sync` with `Authorization: Bearer $CRON_SECRET` |

Scans incrementally via Gmail **History API** when `google_connections.history_id` is set; otherwise `newer_than:14d` full scan (excludes chats/promos/social). On expired history, falls back to full scan and refreshes `history_id` from profile.

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
