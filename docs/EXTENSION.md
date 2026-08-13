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

Migrations through **`014_application_form_answers`**. Extension package **v0.9.5**.

## Build

```bash
cd extension && npm run build
```

Chrome → Extensions → Load unpacked → `extension/dist` (or Reload after rebuild).

## Autofill (v0.9.5)

1. **Autofill** fills known profile fields with scroll + green highlight (job must already be saved).
2. Closed fields (Yes/No, select, radio, **Greenhouse react-select combobox**) → pick buttons when ≤8 options; larger lists (Country…) stay typeahead/text.
3. Free-text / sensitive without readable options → type or Accept AI draft; lasting facts can **Also save to master?**
4. Answering **No** auto-fills later “If yes / please explain” follow-ups with **N/A**.
5. **Autofill Information** holds profile preview, **progress %** (includes Resume PDF when the form has an upload), and Generate / attach actions. Generate opens the HireIQ website (full Q&A + edit). On tab focus, resume list refreshes and selects the newest PDF.
6. **Questions** is for repetitive ATS Q&A (pick / type / Accept).

## Save-first (v0.8+)

1. On panel boot, `GET /api/extension/jobs/by-url` checks if this URL is already saved.
2. If saved → **Saved** chip, Autofill enabled, resume list loaded.
3. If not → Save button; Autofill + Submit disabled with “Save this job first”.
4. Autofill never auto-saves — you must Save first.
## Submit (v0.7 — Phase 3)

- Panel **Submit on this site** finds Submit/Apply on the page, scrolls, highlights, and clicks **only when you press it**.
- Requires the job to be saved first.
- If the form has a resume upload and none is attached → Submit stays blocked (“Finish Autofill to submit”).
- Pending review answers → confirm dialog (“Submit anyway?”).
- After click → marks the application **Applied** in HireIQ.
- **LinkedIn / Indeed:** blocked from automated click — you submit yourself.

If the panel doesn’t appear on a job page: open the HireIQ popup once (injects the content script), or set Site access → **On all sites** on `chrome://extensions`.

## Panel behavior

| Action | Behavior |
|--------|----------|
| **Autofill Information** | Open `<details>`; summary Name · email · location; progress + Generate/attach inside |
| **Autofill** | Requires saved job → animated known-field fill → AI provisional drafts → Questions → attach resume/cover PDF |
| **Questions** | One expanded card at a time; Accept / Edit / Skip; lasting facts can promote to master |
| **Submit on this site** | Disabled until saved; blocked if resume upload present and not attached; user-watched click; marks Applied |
| **Save to HireIQ** | Creates job/application; then enables Autofill + shows Saved chip |
| **Progress** | Bar + N/M ready + %; field checklist + Resume PDF row when upload exists |
| **Generate resume / cover** | Opens HireIQ website from Autofill Information |
| **Employer account needed** | If login/signup wall detected — you create the account; paste the email for tracking |

We do **not** create ATS accounts or mask emails for you. Sensitive EEOC/salary/conviction fields are skipped client-side and by the drafts API.

## Auth model

- Website connect → one-time `hiqc_` code → extension stores Supabase access/refresh tokens.
- APIs accept `Bearer <supabase_jwt>` or legacy `Bearer hiq_…`.

## Relevant APIs (Bearer)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/extension/jobs/by-url?url=` | `{ saved: false }` or `{ saved: true, jobId, trackerUrl, resumeUrl, coverUrl }` |
| `GET` | `/api/extension/jobs/[id]/resumes` | `{ resumes: [{ id, label, updatedAt, hasCoverLetter }] }` |
| `GET` | `/api/extension/jobs/[id]/pdf?type=resume\|cover&tailoredResumeId=` | Optional resume id (must belong to user+job); JSON availability includes `tailoredResumeId` |
| `POST` | `/api/extension/autofill/accept` | Writes `applications.form_answers` |

Dashboard (session cookie): `PATCH` / `DELETE` `/api/applications/[id]/answers` for edit/remove on Activity.
