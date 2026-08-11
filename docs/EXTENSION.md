# HireIQ Chrome extension

**Save + Autofill copilot** — Jobright-style right panel, linked to your HireIQ tracker.

## Connect (preferred)

1. Build & load unpacked from `extension/dist`.
2. Click the HireIQ icon → **Connect HireIQ**.
3. A normal tab opens `/extension/connect` — sign in with **Google or email/password** (same as the website).
4. The page hands a one-time code to the extension automatically.
5. Popup shows **Connected**.

No special Supabase `chromiumapp.org` redirect required for this flow. Popup blockers don’t apply (it’s a tab from a user click).

**Advanced fallbacks:** Google via `chrome.identity`, or paste a legacy `hiq_` token.

## Prerequisites

```
SUPABASE_SERVICE_ROLE_KEY=…
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
```

Migrations through **`014_application_form_answers`**. Extension package **v0.7.0**.

## Build

```bash
cd extension && npm run build
```

Chrome → Extensions → Load unpacked → `extension/dist` (or Reload after rebuild).

## Autofill (v0.6+)

1. **Autofill** auto-saves the job, fills known profile fields with scroll + green highlight.
2. AI drafts unanswered questions in **muted gray** (dashed amber) — Accept / Edit / Skip in the panel.
3. Sensitive fields (EEOC, salary, conviction, sponsorship…) are never invent-filled — panel asks you to answer.
4. If a tailored resume/cover PDF exists for the job, it attaches to file inputs; otherwise **Generate & attach**.
5. Accept lasting facts → optional **Also save to master?**

## Submit (v0.7 — Phase 3)

- Panel **Submit on this site** finds Submit/Apply on the page, scrolls, highlights, and clicks **only when you press it**.
- Pending review answers → confirm dialog (“Submit anyway?”).
- After click → marks the application **Applied** in HireIQ.
- **LinkedIn / Indeed:** blocked from automated click — you submit yourself.

If the panel doesn’t appear on a job page: open the HireIQ popup once (injects the content script), or set Site access → **On all sites** on `chrome://extensions`.

## Panel behavior

| Action | Behavior |
|--------|----------|
| **Your Autofill Information** | Master profile contact + skills |
| **Autofill** | Auto-saves job → animated known-field fill → AI provisional drafts (gray) → review cards → attach resume/cover PDF if available |
| **Review AI answers** | Accept / Edit (save) / Skip per draft; lasting facts can promote to master |
| **Submit on this site** | User-watched click of Submit/Apply; marks Applied in HireIQ |
| **Save to HireIQ** | Creates job/application + post-save links |
| **Generate resume / cover** | Opens tracker Documents; panel also offers **Generate & attach** when PDF missing |
| **Employer account needed** | If login/signup wall detected — you create the account; paste the email for tracking |

We do **not** create ATS accounts or mask emails for you. Sensitive EEOC/salary/conviction fields are skipped client-side and by the drafts API.

## Auth model

- Website connect → one-time `hiqc_` code → extension stores Supabase access/refresh tokens.
- APIs accept `Bearer <supabase_jwt>` or legacy `Bearer hiq_…`.
