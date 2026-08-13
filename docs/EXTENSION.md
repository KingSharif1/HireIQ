# HireIQ Chrome extension

**Save + Autofill copilot** — Jobright-style right panel, linked to your HireIQ tracker.

## Connect (preferred)

1. Build & load unpacked from `extension/dist`.
   - **Local:** `cd extension && npm run dev` (or `vite build --mode development`) — shows API URL + Advanced.
   - **Prod / Store zip:** `cd extension && npm run build` — hides localhost controls; API is always `https://hireiq.kingsharif.com`.
2. Click the HireIQ icon → **Connect HireIQ**.
3. A normal tab opens `/extension/connect` — if you’re already signed in on HireIQ, it links instantly; otherwise sign in (Google or email).
4. Popup shows **Connected** (+ email).
5. On a job page use Autofill + Save.

No special Supabase `chromiumapp.org` redirect required for this flow.

**Chrome cannot silently auto-link with zero clicks** (security). Closest UX: already signed in on the site → one Connect click → instant link.

**Advanced (dev builds only):** Google via `chrome.identity`, or paste a legacy `hiq_` token. Hidden in production builds.

Extension package **v0.9.8**. `externally_connectable` includes `https://hireiq.kingsharif.com/*`. Save-job hosts include `amazon.jobs` and `careers.microsoft.com`; the HireIQ app host is blocked.

## Prerequisites

```
SUPABASE_SERVICE_ROLE_KEY=…
NEXT_PUBLIC_APP_URL=http://localhost:3000   # or https://hireiq.kingsharif.com for prod smoke
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
```

Migrations through **`014_application_form_answers`**.

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
| **Employer account needed** | Today: user creates account manually. **Planned:** mode-aware agent — see [Agentic apply](#agentic-apply-planned) |

We do **not** create ATS accounts or mask emails for you **today** (v0.9). Sensitive EEOC/salary/conviction fields are skipped client-side and by the drafts API.

See **[Agentic apply (planned)](#agentic-apply-planned)** below for the v2 vision — multi-step navigation, account creation tied to email tracking mode, and verification-code handling.

## Agentic apply (v1 — shipped)

> **Status:** MVP shipped in extension v0.9.8+. Multi-step Continue, signup autofill, verification polling tied to `email_tracking_mode`. Full unattended apply on every ATS is still evolving — add rules when a host fails (same pattern as job URL fetching).

### Goal

Extend the extension from **“fill this page”** to **“complete this application”** when the user opts in: navigate multi-step ATS flows, create employer portal accounts when needed, handle email verification, and continue applying — while respecting the user’s **email tracking mode** from Settings (`gmail` | `masked` | `off`).

The apply identity and inbox strategy must **match how we track mail** (see `DECISIONS.md` — exclusive tracking modes). One source of truth: Settings → extension apply behavior.

### Navigation & multi-step flows

The agent should behave like a careful human on the page:

| Situation | Planned behavior |
|-----------|------------------|
| “Next” / “Continue” before the form | Detect and click the primary forward control; wait for the next step to load |
| Multi-page apply (Workday, iCIMS, etc.) | Advance step-by-step; re-run field scan + autofill on each page |
| Login / signup wall before apply | Branch on tracking mode (below) — do not blindly create accounts |
| CAPTCHA / hard auth | Pause; surface in panel for user to complete; resume after |
| LinkedIn / Indeed submit | Stay **manual** (no automated submit click — existing lock) |

This is the same “agentic” idea as smart job URL fetching: when a new ATS pattern fails, document it and add a rule (selectors, wait conditions, step order) so the next run is more reliable.

### Account creation — tied to `email_tracking_mode`

When an employer asks the user to **create an account** or **sign in** before applying:

#### `gmail` — Gmail tracking connected

- **Apply email:** User’s Gmail (same mailbox we sync for status updates).
- **Account creation:** Extension may register on the employer site using that Gmail + profile-derived name/password (stored as application credentials in HireIQ, not in the extension alone).
- **Verification codes:** If the portal sends a one-time code to email, HireIQ reads the matching message via **Gmail read-only sync** (already the MVP tracking path), extracts the code, and the extension enters it to continue.
- **Requirements:** User must have connected Google with `gmail.readonly` + valid refresh token; CASA/production OAuth as today.
- **User visibility:** Timeline + Activity show “Account created with Gmail”; optional notification when verification is consumed.

#### `masked` — Masked apply address

- **Apply email:** User’s HireIQ masked inbound address (`profiles.masked_email`).
- **Account creation:** Extension registers with the masked email so employer mail lands in our inbound pipeline → forward/log → job timeline.
- **Verification codes:** Parse from **masked inbound** (Resend webhook / inbound match — same path as employer status mail), not Gmail.
- **Login override / timeline:** Because the user does not own that inbox directly, the job **Activity / Email** tab (or a dedicated “Portal login” card) must show:
  - masked email used
  - generated password (or “set password” link flow if the ATS allows)
  - verification events (“Code received · applied automatically”)
  - manual override if the user wants to sign in themselves later
- **Requirements:** Masked address provisioned; inbound parsing for OTP patterns (subject/body heuristics per ATS).

#### `off` — No email tracking

- **Apply email:** Whatever the user types in the form (profile preferred email) — we do **not** choose a tracking identity for them.
- **Account creation:** **Not allowed** — we cannot reliably receive verification codes or link employer mail to the job.
- **Still allowed:** Autofill all fields on the current page + **Submit on this site** (user-watched click) when the form is complete and no signup wall blocks progress.
- **UX copy:** Panel explains: “Turn on Gmail or masked tracking in Settings to let HireIQ create accounts and finish verification for you.”

### End-to-end flow (conceptual)

```
Save job → Autofill step 1 → [Next] → Autofill step 2 → …
  → Signup wall?
       gmail   → create account (Gmail) → wait OTP → Gmail sync → enter code → continue
       masked  → create account (masked) → wait OTP → inbound webhook → enter code → continue + log credentials on timeline
       off     → stop at wall; user creates account manually OR applies elsewhere; autofill-only on open pages
  → Attach resume → Review Questions → Submit (or user Submit on blocked hosts)
  → Mark Applied + log portal credentials / email used on application record
```

### Safety & consent (planned locks)

- **Opt-in per application** — “Apply for me” is not silent; user starts the agent from the panel.
- **No password reset on personal email** — portal accounts use the tracking identity (Gmail or masked), not a random personal alias collision (Sprout pattern — see `legacy/planning/12-sprout-research.md`).
- **Sensitive fields** — EEOC, salary, conviction, etc. remain skip-or-user-confirms even in agentic mode.
- **Audit trail** — Every automated click, account create, and code entry writes to `application_events` for Activity tab review.

### Relationship to current product

| Today (v0.9) | Planned (agentic) |
|--------------|-------------------|
| Single-page autofill + manual Submit | Multi-step navigation + optional full apply |
| User creates employer accounts | Agent creates when tracking mode allows |
| Gmail sync for status after manual apply | Gmail/masked also powers OTP during apply |
| “Employer account needed” → user action | Mode-aware branch (create vs autofill-only) |

### Implementation notes (for future tasks)

- Reuse extension content script for DOM actions; background coordinates with HireIQ APIs for credentials, Gmail sync poll, and inbound OTP match.
- OTP matching needs ATS-specific rules (subject lines, expiry windows) — same “learnable rules” pattern as job URL fetching.
- Credit/pricing complexity (simple vs Workday multi-step) deferred — see legacy Q33 / Sprout research.

**Revisit when:** Gmail sync (Task 114) and masked inbound (Task 139) are stable in production; then spike agentic navigation on one ATS (e.g. Greenhouse) before Workday.

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
