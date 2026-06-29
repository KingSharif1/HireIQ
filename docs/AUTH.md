# HireIQ — Auth Setup

Supabase Auth powers sign-in. The app supports **email + password** and **Google OAuth**.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Dashboard

### 1. URL configuration

**Authentication → URL configuration**

| Setting | Local dev | Production |
|---------|-----------|------------|
| Site URL | `http://localhost:3000` | `https://your-domain.com` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://your-domain.com/auth/callback` |

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

### 3. Google OAuth

**Authentication → Providers → Google**

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste Client ID + Secret into Supabase

### 4. Database trigger

Run migrations in order through **`007_auth_profile_trigger.sql`** so new users get a `profiles` row with `first_name` / `last_name`.

## App routes

| Route | Purpose |
|-------|---------|
| `/login` | Email + Google sign-in |
| `/signup` | Create account |
| `/forgot-password` | Request reset email |
| `/reset-password` | Set new password (after email link) |
| `/auth/callback` | OAuth + email confirm code exchange |

## Middleware

`middleware.ts` protects `/dashboard/*` and redirects logged-in users away from login/signup.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth redirects to login with `error=auth_failed` | Add callback URL in Supabase redirect allowlist |
| Google sign-in works but name is blank | Run migration 007; re-login syncs via callback |
| Email signup never confirms | Check spam; confirm Site URL matches your app origin |
| Reset link does nothing | Ensure `/auth/callback` is in redirect URLs |
