# HIREIQ — PRODUCT & ENGINEERING SPEC

**Version:** 1.0  
**Last Updated:** June 25, 2026  
**Purpose:** Complete specification for building HireIQ — an AI-powered resume tailoring and job tracking platform. This doc covers data architecture, integrations, agent behavior, UI/UX, and the exact tailoring workflow.

---

## PRODUCT VISION

Two things, done exceptionally well:

1. **Tailor a resume** — take a job posting and a user's background, produce a tailored resume that passes ATS and reads like a human wrote it, with tracked changes the user can accept or decline
2. **Track applications** — know every job the user has applied to, surface emails automatically, and display everything in one clean view

Everything else is secondary to these two.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
User
 │
 ├── Resume Upload (PDF/DOCX)
 ├── GitHub OAuth
 ├── Gmail OAuth
 └── Job URL or pasted JD
         │
         ▼
    HireIQ Core
         │
    ┌────┴────────────────────────────┐
    │                                 │
Profile Engine                  Job Ingestion Engine
    │                                 │
    ├── Parsed resume data            ├── Fetch JD (URL or paste)
    ├── GitHub repo context           ├── Extract requirements
    ├── Work history                  ├── Score against profile
    ├── Projects + metrics            └── Gap analysis
    └── Skills (tiered)
         │
         ▼
    Tailoring Engine
         │
         ├── Build tailored resume
         ├── Tracked changes (accept/decline)
         ├── ATS check
         ├── Human readability check
         └── Visual render + verify
              │
              ▼
    Application Tracker
         │
         ├── Job log with all details
         ├── Gmail scan (daily)
         ├── Status updates
         └── Follow-up reminders
```

---

## MODULE 1 — PROFILE ENGINE

### 1.1 Resume Parsing

**Input:** PDF or DOCX upload  
**Goal:** Extract structured data — not just text, structured meaning-aware data

**What to extract:** contact, education, experience (bullets, technologies, metrics), projects, tiered skills (core/familiar/tools), licenses, certifications.

**Parsing approach:** Claude structured extraction → JSON only → validate → flag placeholders → store raw text alongside structured data.

**Handling bad PDFs:** OCR fallback (Tesseract), multiple extraction methods, DOCX via mammoth, low-confidence section flags for user verification.

### 1.2 GitHub Integration

OAuth scopes: `read:user`, `repo`. Pull per-repo metadata (languages, commits, README summary, status active/stale/archived). Cross-reference with resume projects. Daily light sync + full sync on demand.

### 1.3 Profile Storage Schema (Supabase)

Tables: `profiles`, `experiences`, `projects`, `skills` (tiered: core | familiar | learning).

---

## MODULE 2 — JOB INGESTION ENGINE

### 2.1 Fetching Job Postings

Per-ATS strategies: Workday internal API, Greenhouse API, Lever API, Ashby (embed/API), LinkedIn → paste prompt, aggregators → warn + low confidence, Playwright fallback, never fail silently.

### 2.2 JD Extraction

Structured output including `key_phrases` (2+ occurrences), `ats_keywords`, `red_flags`, `posting_age_days`.

---

## MODULE 3 — TAILORING ENGINE

### 3.1 Gap Analysis

Three tiers: direct match, adjacent match (with honest framing + 3 verification checks), real gap (never claimed).

### 3.2 Questions for User

Max 2–3, only when profile + GitHub cannot resolve. Never ask what's already in resume/GitHub.

### 3.3 Resume Construction

Section order by role type. Bullets: strong verb + action + detail + impact. Human readability test. Red-flag phrase list triggers rewrite.

### 3.4 ATS Check

Keyword coverage (70%+ required), density, formatting rules. Score 0–100 with breakdown.

### 3.5 Visual Render & Layout Check

Page length by seniority, layout consistency, placeholder detection, skills backed by bullets above.

### 3.6 Tracked Changes UI

Change types: added, modified, removed, reordered, rephrased. Accept / Decline / Edit per change. Decline feedback stored. Accept all / Decline all.

---

## MODULE 4 — APPLICATION TRACKER

Tables: `applications`, `application_events`. Card list + detail view + Kanban pipeline. Gmail `readonly` daily scan with confidence scoring (high auto-link, medium/low user confirm).

---

## MODULE 5 — QUALITY ASSURANCE CHECKLIST

Content, relevance, ATS, and visual/layout checks before presenting resume to user. See full checklist in source document.

---

## TECH STACK

Next.js 15, Tailwind, Shadcn, Supabase, Claude (Sonnet tailor, Haiku quick checks), docx + puppeteer/playwright PDF, GitHub OAuth + Octokit, Gmail API, Playwright for job fetch, Supabase Storage, Edge Functions + pg_cron.

---

## PHASE 1 — MVP SCOPE (build in order)

1. Resume upload + parse  
2. GitHub connect  
3. Job URL ingestion (top 5 ATS types)  
4. Gap analysis (three-tier)  
5. Tailored resume + tracked changes UI  
6. ATS + visual check  
7. Application log (basic CRUD)

**Phase 2:** Gmail, fit score, application detail timeline, accept/decline feedback loop  
**Phase 3:** Multi-user, public API, Chrome extension

---

> **Note:** This file is the canonical product spec. For implementation mapping see [ARCHITECTURE.md](./ARCHITECTURE.md) and [STATUS.md](./STATUS.md).
