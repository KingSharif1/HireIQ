# Live competitor playbook → HireIQ extension

Captured 2026-08-09 against real Greenhouse apply + Teal job tracker in research Chrome.

Screenshots: `.ui-audit/ext-compare/live-test/`

## What Teal does (save → dashboard)

On **Teal Job Tracker** after saving Liberty Software:

1. Job workspace opens: title, company, location, “Saved … ago on greenhouse”.
2. **Stage chevron:** Bookmarked → Applying → Applied → Interviewing → Negotiating → Accepted.
3. Tabs: **Job Info · Notes · Resumes · Contacts · Email Templates · Check List**.
4. JD keywords / requirements on the side (resume improvement surface).

**HireIQ mirror:** Save from extension → deep-link `/dashboard/tracker/{jobId}` (already returned as `trackerUrl`). Panel should emphasize **Open in HireIQ** after save so users land on stage + Resumes like Teal.

## What Jobright does (autofill on the form)

On Aechelon Greenhouse apply (`job-boards.greenhouse.io/...`):

1. **Right sidebar** (not a tiny pill): match score, job card, primary **Autofill**.
2. Click Autofill → within ~3–5s filled:
   - first_name, last_name, preferred_name, email, phone
   - LinkedIn, Website (including duplicate question fields)
   - “How did you hear…” → LinkedIn
3. Resume file attached from Jobright library (`linkedin_profile_export.pdf`).
4. Panel updates to **8/8 required fields filled 100%** + checklist (required/optional + custom questions).
5. Does **not** auto-submit — user reviews and clicks Apply.

**HireIQ mirror (Phase 2a):**

| Jobright | HireIQ |
|--|--|
| Right sidebar | Right sidebar panel |
| Match score | Later (tailor API); placeholder / hide until ready |
| Autofill CTA | Autofill from HireIQ profile |
| Field checklist + % | Same |
| Generate Custom Resume | Link “Improve resume” → tracker / builder for that job |
| Credits | Skip |
| Autofill Information | Profile on HireIQ site |

## HireIQ product loop (confirmed)

1. Detect job / apply page → open panel.
2. **Save to tracker** → open job workspace on HireIQ (Teal).
3. **Autofill** apply form from profile (Jobright).
4. Background: tailor resume + score; panel / site asks improvement questions.
5. User finishes unanswered fields + submits themselves (no silent submit).
