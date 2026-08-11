# HireIQ — Auth Setup

Supabase Auth powers sign-in. The app supports **email + password** and **Google OAuth**.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Server-only — Chrome extension APIs (token + JWT verify; never expose)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Masked application email — see EMAIL.md
MASKED_EMAIL_DOMAIN=mail.kingsharif.com
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
# RESEND_FORWARD_FROM=HireIQ <noreply@mail.kingsharif.com>
```

## Supabase Dashboard

### 1. URL configuration

**Authentication → URL configuration**

| Setting | Local dev | Production |
|---------|-----------|------------|
| Site URL | `http://localhost:3000` | `https://your-domain.com` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://your-domain.com/auth/callback` |

Also add the Chrome extension redirect **only if** you use Advanced → “Sign in with Google (extension window)”:

```
https://<EXTENSION_ID>.chromiumapp.org/
```

**Preferred:** Connect HireIQ opens `/extension/connect` in a normal tab (Google or email on the website) — no chromiumapp URL required. See [EXTENSION.md](./EXTENSION.md).


Add both if you use local + prod:

```
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
```

Password reset and email confirm links use the same callback with `?next=/reset-password` when needed.

### 2. Email provider

**Authentication → Providers → Email**

- Enable email signups
- Confirm email: **on** for production (off optional for local testing)

Email/password sign-in is working on the HireIQ Supabase project.

### 3. Google OAuth

**Authentication → Providers → Google**

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste Client ID + Secret into Supabase
4. **Enable** the Google provider (disabled = `provider is not enabled` in auth logs)

### 4. Database migrations

Run migrations in order through **`007_auth_profile_trigger.sql`**.

| Migration | Purpose | Remote status (2026-06-29) |
|-----------|---------|----------------------------|
| 001–005 | Core schema, profile, notifications, job status | ✓ Applied |
| 006 | `change_decisions`, `original_structured_data` on `tailored_resumes` | ✓ Applied via MCP |
| 007 | Signup trigger sets `first_name` / `last_name` on `profiles` | ✓ Trigger existed; file synced to match remote schema |

Project: `wsbbgznobxhjefaqbniv` · URL: `https://wsbbgznobxhjefaqbniv.supabase.co`

Security fix `revoke_handle_new_user_public_execute` also applied remotely.

## App routes

| Route | Purpose |
|-------|---------|
| `/login` | Email + Google sign-in |
| `/signup` | Create account |
| `/forgot-password` | Request reset email |
| `/reset-password` | Set new password (after email link) |
| `/auth/callback` | OAuth + email confirm code exchange; syncs profile names |

## Proxy (`proxy.ts`)

Next.js 16 uses **`proxy.ts`** instead of the deprecated `middleware.ts` convention.

`proxy.ts` at the repo root:

- Refreshes the Supabase session on each matched request
- Redirects unauthenticated users from `/dashboard/*` → `/login`
- Redirects authenticated users from `/login`, `/signup`, `/forgot-password` → `/dashboard`
- Does **not** redirect `/reset-password` (recovery session must stay)

`config.matcher` must be defined in `proxy.ts` — do not re-export from another file.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth redirects to login with `error=auth_failed` | Add callback URL in Supabase redirect allowlist |
| Google: `provider is not enabled` | Enable Google provider in Supabase Dashboard |
| Google sign-in works but name is blank | Run migration 007; re-login syncs via callback |
| Email signup never confirms | Check spam; confirm Site URL matches your app origin |
| Reset link does nothing | Ensure `/auth/callback` is in redirect URLs |
| `middleware.ts` + `proxy.ts` conflict | Delete `middleware.ts`; use `proxy.ts` only (Next.js 16) |
