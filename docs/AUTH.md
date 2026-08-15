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
| Site URL | `http://localhost:3000` | `https://hireiq.kingsharif.com` (preferred when live) |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://hireiq.kingsharif.com/auth/callback` |

Also add the Chrome extension redirect **only if** you use Advanced → “Sign in with Google (extension window)”:

```
https://<EXTENSION_ID>.chromiumapp.org/
```

**Preferred:** Connect HireIQ opens `/extension/connect` in a normal tab (Google or email on the website) — no chromiumapp URL required. See [EXTENSION.md](./EXTENSION.md).


Add **both** for local + prod testing:

```
http://localhost:3000/auth/callback
https://hireiq.kingsharif.com/auth/callback
https://hireiq-nu.vercel.app/auth/callback
```

Password reset and email confirm links use the same callback with `?next=/reset-password` when needed.

### 2. Email provider

**Authentication → Providers → Email**

- Enable email signups
- Confirm email: **on** for production (off optional for local testing)

Email/password sign-in is working on the HireIQ Supabase project.

### 3. Google OAuth (required for “Continue with Google”)

**Status (2026-08-15):** Google provider is **enabled** on Supabase `wsbbgznobxhjefaqbniv` (authorize redirects to Google Cloud client `746338339011-…`). Brand verification for project `hireiq-505323` is **approved** — still publish branding + submit **Data access** for `gmail.readonly` (see [GOOGLE-VERIFICATION.md](./GOOGLE-VERIFICATION.md) “Brand approved but still…”).

This is **Supabase Auth Google** (sign-in). It is separate from **Gmail sync** (`GOOGLE_CLIENT_*` → `/api/google/callback`, Task 114). You can reuse one Google Cloud OAuth client if you add **both** redirect URIs below.

#### A. Google Cloud Console

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create credentials → OAuth client ID → Web application**
3. Authorized JavaScript origins (optional but tidy):
   - `http://localhost:3000`
   - `https://hireiq.kingsharif.com`
4. **Authorized redirect URIs** (add all you need):
   - `https://wsbbgznobxhjefaqbniv.supabase.co/auth/v1/callback` ← **required for Google login**
   - `http://localhost:3000/api/google/callback` ← Gmail sync (local)
   - `https://hireiq.kingsharif.com/api/google/callback` ← Gmail sync (prod)
5. Copy **Client ID** and **Client secret**

#### B. Supabase Dashboard

**Authentication → Providers → Google**

1. Toggle **Enable**
2. Paste Client ID + Client secret
3. Save

**Authentication → URL configuration** — redirect allowlist must include app callbacks (section 1). For Advanced extension Google-in-popup only, also add:

```
https://<EXTENSION_ID>.chromiumapp.org/
```

Find `EXTENSION_ID` on `chrome://extensions` (Developer mode). Prefer **Connect HireIQ** (website tab) so users can use Google *or* email without the chromiumapp URL.

#### D. “Google hasn’t verified this app” / Access blocked (403)

Two different Google checks:

| What you see | Cause | Fix |
|--------------|--------|-----|
| Red **“Google hasn’t verified this app”** + Advanced | Sensitive scope `gmail.readonly` not yet **Data access**–verified (brand-only approval is not enough) | Publish branding → submit Data access verification — [GOOGLE-VERIFICATION.md](./GOOGLE-VERIFICATION.md) |
| **Access blocked** / only some accounts work | Audience still **Testing** | Add **Test users**, or set Audience → **In production** |

While Data access review runs:

1. [Auth Platform → Audience](https://console.cloud.google.com/auth/audience) → keep **Testing** or move to **In production** when ready
2. If Testing: **Test users** → add every Gmail you’ll use
3. On the warning screen: **Advanced** → continue (expected until sensitive-scope approval)

CASA only if Google escalates to **restricted** scopes (we do not request those).

Full checklist + paste-ready justification: [GOOGLE-VERIFICATION.md](./GOOGLE-VERIFICATION.md).

#### C. Smoke test

1. Hard-refresh `/login` (or clear site cookies if you saw refresh-token errors)
2. **Continue with Google** → Google consent → land on `/dashboard` (or `?next=` destination)
3. Extension: **Connect HireIQ** → same login (Google or email) → return to extension connected

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
- On stale/missing refresh tokens (`refresh_token_not_found`), clears `sb-*` cookies and treats the user as logged out (stops console spam)
- Redirects unauthenticated users from `/dashboard/*` → `/login`
- Redirects authenticated users from `/login`, `/signup`, `/forgot-password` → `/dashboard` (honors safe `?next=`)
- Does **not** redirect `/reset-password` (recovery session must stay)

`config.matcher` must be defined in `proxy.ts` — do not re-export from another file.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth redirects to login with `error=auth_failed` | Add callback URL in Supabase redirect allowlist |
| Google: `provider is not enabled` / friendly UI message | Enable Google in Supabase + paste Google Cloud client (section 3) |
| “Google hasn’t verified this app” after brand email | Publish branding + submit **Data access** for `gmail.readonly` — brand ≠ scope verification |
| `Invalid Refresh Token: Refresh Token Not Found` | Stale cookies — clear site data for localhost/prod, or hit `/login` after proxy clears `sb-*`; then sign in again |
| Google sign-in works but name is blank | Run migration 007; re-login syncs via callback |
| Email signup never confirms | Check spam; confirm Site URL matches your app origin |
| Reset link does nothing | Ensure `/auth/callback` is in redirect URLs |
| Extension Google popup fails after site Google works | Add `https://<EXTENSION_ID>.chromiumapp.org/` to redirect URLs, or use **Connect HireIQ** instead |
| `middleware.ts` + `proxy.ts` conflict | Delete `middleware.ts`; use `proxy.ts` only (Next.js 16) |
