# HireIQ — Google OAuth verification runbook

Use this to finish **branding** tonight and **submit app verification** (incl. Gmail read-only). Review can take days; you can keep using **Test users** meanwhile.

**Production:** https://hireiq.kingsharif.com  
**Google Cloud project:** the one behind your OAuth client  
**Supabase project:** `wsbbgznobxhjefaqbniv`

---

## What’s already live (code / site)

| Asset | URL | Status |
|-------|-----|--------|
| App name on homepage | https://hireiq.kingsharif.com/ | Live — says **HireIQ** + purpose |
| Privacy | https://hireiq.kingsharif.com/privacy | Live — covers Gmail readonly |
| Terms | https://hireiq.kingsharif.com/terms | Live |
| Logo | https://hireiq.kingsharif.com/logo.png | Live (square PNG) |
| App icon SVG | https://hireiq.kingsharif.com/logo.svg | Live |

Scopes the app requests:

- Non-sensitive: `openid`, `email`, `profile`
- Sensitive: `https://www.googleapis.com/auth/gmail.readonly`  
  (Sensitive → Google review + demo video. Not the broad `mail.google.com` restricted scope; CASA only if Google asks.)

---

## Tonight — do in this order

### 1. Domain ownership (unblocks branding)

1. Open [Google Search Console](https://search.google.com/search-console)
2. Add property → **Domain** `kingsharif.com` (preferred) *or* URL prefix `https://hireiq.kingsharif.com/`
3. Complete DNS TXT (or HTML) verification
4. Confirm property shows **Verified**

Same Google account as the Cloud project owner/editor.

### 2. OAuth Branding fields (exact values)

[Google Auth Platform → Branding](https://console.cloud.google.com/auth/branding) (or APIs → OAuth consent screen)

| Field | Value |
|-------|--------|
| App name | `HireIQ` |
| User support email | `sharifahmed.dev@gmail.com` |
| App logo | Upload `public/logo.png` from repo (or download from prod) |
| Application home page | `https://hireiq.kingsharif.com/` |
| Privacy policy | `https://hireiq.kingsharif.com/privacy` |
| Terms of service | `https://hireiq.kingsharif.com/terms` ← **not** `/privacy` |
| Authorized domains | `kingsharif.com` · `wsbbgznobxhjefaqbniv.supabase.co` |
| Developer contact | `sharifahmed.dev@gmail.com` |

Save → **View issues** → select **I have fixed the issues** → **Proceed**.

### 3. Data Access / scopes declared

In Auth Platform → **Data Access** (or consent screen → scopes), declare exactly:

```
openid
email
profile
https://www.googleapis.com/auth/gmail.readonly
```

Enable **Gmail API** under APIs & Services → Library if not already.

### 4. Enable Google login in Supabase (so the product works)

**Authentication → Providers → Google** → Enable → paste Client ID + secret from Google Cloud.

Redirect URIs on the OAuth **Web** client must include:

```
https://wsbbgznobxhjefaqbniv.supabase.co/auth/v1/callback
https://hireiq.kingsharif.com/api/google/callback
http://localhost:3000/api/google/callback
```

Supabase redirect allowlist:

```
https://hireiq.kingsharif.com/auth/callback
http://localhost:3000/auth/callback
```

### 5. Test users (until verification approved)

Consent screen → **Audience** / Testing → add:

- Your Gmail(s) you apply with
- Any other accounts you’ll use

You can apply to jobs with HireIQ under Testing; only listed accounts can OAuth.

### 6. Submit **App verification** (sensitive scope)

[Submit for verification](https://support.google.com/cloud/answer/13461325) from the Cloud Console verification / OAuth overview.

**Publishing:** move toward **In production** only when you’re ready to submit; Google will still gate sensitive scopes until approved.

#### Scope justification (paste)

> HireIQ is a job-search workspace. Users optionally connect Google so HireIQ can use read-only Gmail access (`gmail.readonly`) to find employer application confirmations and status emails and attach them to the matching job in the user’s application tracker. HireIQ does not send, delete, or modify mail. Users can disconnect Google or switch to a HireIQ masked application email in Settings. Sign-in uses `openid`, `email`, and `profile` only for account identity.

#### Demo video (record ~2–4 min, unlisted YouTube)

Show in order:

1. Logged-out homepage — **HireIQ** name + what the product does  
2. Privacy + Terms links in footer  
3. Sign in with Google — consent screen showing scopes  
4. Dashboard / application tracker with a job  
5. Settings → Integrations → Gmail / email tracking (connect or already connected)  
6. Say on camera: “We only request read-only Gmail to match employer emails to applications; we never send mail as the user.”  
7. Optional: show disconnect / switch to masked email  

Paste the YouTube URL in the verification form.

#### Other form tips

- App type: Web application  
- Homepage / privacy / terms: same URLs as branding  
- How you use data: match privacy policy § Google / Gmail  
- Contact emails: must receive Google’s review mail  

---

## After you click Submit

| Wait for | Meanwhile |
|----------|-----------|
| Branding approved (often faster) | Logo/name show on consent |
| Sensitive-scope review (days–weeks) | Keep **Test users**; use email login + masked email for anyone else |

If Google asks for a security assessment (CASA), that is only for **restricted** scopes or if they escalate — reply with evidence; we intentionally use `gmail.readonly` (sensitive), not full Gmail.

---

## Smoke after Console work

1. Incognito → https://hireiq.kingsharif.com/login → **Continue with Google** (test user)  
2. Land on dashboard  
3. Settings → confirm Gmail tracking / reconnect if needed  
4. Extension → Connect HireIQ → same account  

---

## Repo reference

- Login scopes: `lib/auth/google-sign-in.ts`  
- Auth setup: `docs/AUTH.md` §3  
- Privacy Gmail language: `app/privacy/page.tsx`
