# Masked inbound email (Resend)

**Status:** Task 139 shipped · migration **015** applied remotely (`wsbbgznobxhjefaqbniv`) 2026-08-11  
**Domain:** `mail.kingsharif.com` (Resend receiving verified)

## What it does

HireIQ gives each user one **application email** (e.g. `sharif.abc123@mail.kingsharif.com`).  
They paste it on job applications. Employer mail hits Resend → our webhook → tracker **All outreach** / job **Email** (when company can be matched). Optional forward to their real inbox.

This is **not** Gmail read — same pattern as Sprout whisperpost.

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

## Env (`.env.local`)

```env
MASKED_EMAIL_DOMAIN=mail.kingsharif.com
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...   # from Resend → Webhooks
# Optional copy-to-inbox:
RESEND_FORWARD_FROM=HireIQ <noreply@mail.kingsharif.com>
SUPABASE_SERVICE_ROLE_KEY=...     # required for webhook DB writes
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Production (deployed)

- App: https://hireiq.kingsharif.com  
- Alias: https://hireiq-nu.vercel.app  
- Webhook endpoint (paste in Resend):  
  `https://hireiq.kingsharif.com/api/webhooks/resend/inbound`  
- After creating the webhook, set `RESEND_WEBHOOK_SECRET` in Vercel → Project → Settings → Environment Variables (Production + Preview), then redeploy.

Also add Supabase Auth redirect URLs:

- Site URL: `https://hireiq.kingsharif.com`  
- Redirect: `https://hireiq.kingsharif.com/auth/callback`

## App surfaces

| Place | Behavior |
|-------|----------|
| Profile → Personal → Application email | Create / copy / forward toggle |
| Applications → All outreach | Matched inbound shows as received (source HireIQ) |
| Job → Email tab | Same entry when matched |
| Alerts | `email_status` notification |

## Schema (migration 015)

- `profiles.masked_email`, `email_forward_to`, `email_forward_enabled`
- `inbound_email_events` + RLS SELECT for owner; inserts via service role only

File: `docs/supabase/migrations/015_masked_inbound_email.sql`

## Smoke checklist

1. Profile → Create application email → copy  
2. Send test from Gmail to that address  
3. Resend → Emails → Receiving shows it  
4. With webhook + tunnel: HireIQ notification + outreach/email log  
5. Forward (optional): real inbox gets `[HireIQ] …` copy  

## Security notes

- Webhook must verify Svix signatures (`RESEND_WEBHOOK_SECRET`)  
- Never expose service role or Resend keys to the client  
- One masked address per user (v1); per-job `+alias` later if needed  

## Related

- Decision: [DECISIONS.md](./DECISIONS.md) — Masked inbound (Resend), not Gmail read  
- Spec background: [legacy/planning/11-email-tracking.md](./legacy/planning/11-email-tracking.md)  
- Task 114 (Gmail scan) remains Phase 2 / lower priority vs this path  
