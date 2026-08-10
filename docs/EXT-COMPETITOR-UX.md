# Competitor extension UX notes (Teal × Jobright)

Captured 2026-08-09 from Chrome Web Store listings + Teal help docs while researching HireIQ Phase 1 save UX.

## Shared pattern (what HireIQ should mirror)

Both Teal and Jobright use an **on-page right-side panel / overlay** on job sites — not only a toolbar popup.

| | Teal Job Search Companion | Jobright Autofill |
|--|--|--|
| Store | [Teal](https://chromewebstore.google.com/detail/teal-job-search-companion/opafjjlpbiaicbbgifbejoochmmeikep) | [Jobright](https://chromewebstore.google.com/detail/jobright-autofill-%E2%80%93-insta/odcnpipkhjegpefkfplmedhmkmmhmoko) |
| Primary UI | Right sidebar overlay on job page | Right side panel / widget |
| Primary CTA | Save / “Saving Job to Teal” | Autofill (Phase 2 for us) + save |
| Job fields | Link, Stage (Bookmarked), Excitement stars, Notes | Job title + Autofill Supported badge + field checklist |
| Scope | Tracker / bookmark first | Autofill-first |

## Teal — save/bookmark flow

From Teal marketing + [help](https://www.tealhq.com/tool/job-search-chrome-extension):

1. User is on a supported job board listing.
2. Extension opens a **sidebar** with prefilled job link.
3. User sets stage (default Bookmarked), optional excitement + notes.
4. CTA saves into Teal tracker with JD / salary / keywords when available.
5. Toolbar duck icon also opens Super Search / tracker — secondary to on-page save.

**HireIQ takeaway:** Keep the floating **Save to tracker** pill; evolve toward a **compact right panel** (title, company, status=Bookmarked, Save) like Teal — not a settings-heavy popup.

## Jobright — autofill panel

From store screenshots:

1. Detects ATS page (Workday, Greenhouse, Lever, Ashby, iCIMS, Jobvite…).
2. Side panel: brand header + **Autofill Supported**.
3. Big primary button (Autofill / Autofilling…).
4. Checklist of application fields still needed.
5. Separate resume-tailor surfaces (score + 1-click improve) — closer to our Builder/Matcher, not Phase 1 save.

**HireIQ takeaway:** Phase 1 = Teal-like save panel. Phase 2 (Task 117) = Jobright-like autofill panel on ATS apply pages.

## Live capture (2026-08-09) — research profile

Chrome profile: `.playwright-chrome-ext-research` · CDP `9222`  
Installed: **Jobright Autofill**, **Teal Job Search Companion** (plus Google Docs Offline).  
Dead job tabs closed (Schwab/Lockheed “Custom Job Error”, Fidelity 404s, Greenhouse `error=true`). Soft-refreshed remaining live jobs.

### Jobright (on-page) — confirmed (logged-in)

After account setup, Greenhouse apply pages show a full **right sidebar** (Plasmo CSUI):

1. Promo banner (Turbo for Students…)
2. Brand header + Feedback / Settings / collapse
3. Job card: company · industry · **match score ring (e.g. 79%)** · title · age · applicant count · “Insider Connections”
4. Primary CTA: big green **Autofill** (+ credits remaining)
5. Secondary stack: Autofill Information · Upload Resume · **Generate Custom Resume** · Upload Cover Letter · **Generate Cover Letter**
6. Footer: “Autofill for Another Job”

Workday shows the same panel + *“Please stay on the Workday page while Autofill fills out the form.”*  
Schwab still leans on site-native **Apply** / **Save job**. Fidelity/Auzmor weaker.

Screenshots: `.ui-audit/ext-compare/job-00-*.png`, `jobright-ready-aechelon.png`.

This is the loop to mirror for HireIQ: score on-page → generate resume in background → autofill apply → deeper questions back in the web app.

### Teal (on-page) — installed, still not visible

Enabled in `chrome://extensions` (`opafjjlpbiaicbbgifbejoochmmeikep`) but **no Teal DOM** on job pages in this profile yet. Needs toolbar open / login, or a page where Teal injects. Capture before copying save-panel UX.

### HireIQ

Not loaded in this research profile yet (`extension/dist` unpacked still optional).

## Target HireIQ loop (product intent)

1. **On job page:** save to tracker *and/or* start apply (autofill) · kick off resume generation in background.  
2. **When ready:** show match score + improvement questions in the extension.  
3. **On HireIQ web:** answer those questions and continue builder / application steps.

Maps to: Teal-like save panel now → Jobright-like autofill (Task 117) → background tailor + score + deep-link back to app.

## Research browser caveat

Playwright-launched Chrome must use **CDP / real Chrome** for Web Store installs. Native “Add extension?” dialogs still require a manual click. A separate research profile may show “already installed” if the Google account has the extension on another profile. Do not call `browser.close()` carelessly during inspect — leave the launcher process running.
