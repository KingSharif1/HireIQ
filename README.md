# HireIQ

> Stop losing jobs you're qualified for. HireIQ asks you the right questions, then rewrites your resume in the language the job is looking for.

---

## The Problem

Most resumes only match ~41% of a job description's keywords on first submission. ATS systems filter you out before a human ever reads your name. The job market for CS grads pivoting into new roles is brutal — not because they lack the skills, but because their resume doesn't speak the language of the job posting.

HireIQ fixes that.

---

## What It Does

HireIQ takes your existing resume and a job description, identifies exactly what's missing, asks targeted questions to fill those gaps with your real experience, and generates a tailored resume + cover letter that's built to pass ATS screening and land interviews.

**The core loop:**

```
Upload resume  →  Paste / scrape job description
       ↓
   ATS score (see where you stand before tailoring)
       ↓
   AI gap analysis  →  3–5 targeted questions
       ↓
   Answer questions  →  AI generates tailored resume
       ↓
   Review diff  →  Export PDF or DOCX
       +
   AI-generated cover letter (streaming, editable)
```

No fluff. No auto-applying to 100 jobs. Just one job, done right.

---

## Vision

Most AI resume tools do one of two things: they rewrite your resume based on buzzwords, or they just stuff keywords in and call it "ATS optimized." Neither actually works, because neither knows what you've actually done.

HireIQ takes a different approach. Instead of guessing, it asks.

### The Conversation-First Tailoring Model

The core idea is simple: **the AI reads the job description, compares it to your resume, and asks you specific questions about the gaps it finds.** Not generic questions — targeted ones based on what the role actually needs and what your resume currently shows.

For example, if you're applying to a backend role that requires distributed systems experience and your resume only mentions "built REST APIs," HireIQ won't just swap in the phrase "distributed systems." It asks: *"This role requires experience with distributed systems. Have you worked on anything involving message queues, caching layers, or services that needed to scale across multiple instances? Even in a personal project?"*

You answer in plain language. You don't need to know how to phrase it for a resume — that's the AI's job. It takes your real answer and rewrites that section of your resume to highlight the relevant experience in the language the job is looking for. Every change is shown as a diff so you see exactly what was added, removed, or reworded — and why.

This matters because:
- Your resume has more in it than you've written down. Most people undersell themselves.
- A generic rewrite sounds fake. Answers based on your actual experience sound like you.
- The cover letter is generated last, after all the Q&A, so it's grounded in the specific talking points you just surfaced — not a template.

### What "Tailored" Actually Means Here

A tailored resume from HireIQ is not a keyword-stuffed copy of your original. It's a version of your resume where:

- The summary is rewritten to speak directly to this role
- Bullet points under relevant jobs are reworded to match the language and scope of what the employer described
- Skills that are relevant are promoted; ones that aren't are deprioritized
- Gaps that you can fill with real experience (even side projects) are filled in
- The format and structure are clean for ATS parsing

The ATS score before and after shows you the actual delta — you can see the score go from 41% to 78% and know it's because your real experience was surfaced, not because fake keywords were inserted.

### The Bigger Picture

The goal is not to help you game the hiring system. It's to make sure you stop losing jobs you're actually qualified for because your resume doesn't communicate it.

Long-term, once the tailoring experience is excellent, HireIQ will expand into helping you find the right jobs to apply to, understand company culture, and prepare for the interview — not as separate tools, but as a single flow that takes you from "I want to change jobs" to "I have an offer."

**v1 (this build):** Resume tailoring + cover letter — the core product. Get this right first.

**v2 (planned):** Job search/discovery, outreach strategy, interview prep. These will only be built once the tailoring experience is excellent. There's no point finding jobs if the application you're sending isn't optimized.

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Latest, serverless-friendly, Turbopack |
| Styling | Tailwind CSS v3 + shadcn/ui + Framer Motion | Fast, accessible, animated |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage in one |
| Auth | Supabase Auth | Email + Google OAuth |
| File Storage | Supabase Storage | Resume uploads + exported PDFs/DOCX |
| AI | Anthropic Claude via Vercel AI SDK v6 | All 5 prompts, streaming cover letter |
| PDF export | `@react-pdf/renderer` (server-side) | No Puppeteer — works on Vercel |
| DOCX export | `docx@9` | Pure Node.js |
| PDF parse | `pdf-parse` + `mammoth` | Extract text from uploaded files |
| Rich text editor | TipTap | Inline editing of tailored resume/cover letter |
| State | Zustand | Tailor flow state machine |

---

## Project Structure

```
app/
  (auth)/login/          ← Email + Google sign-in
  (auth)/signup/
  auth/callback/         ← OAuth exchange
  (dashboard)/           ← Authenticated shell (sidebar + mobile nav)
    page.tsx             ← Home: resume list + recent activity
    resume/              ← Resume upload, list, detail view
    jobs/                ← Paste JD text or drop a job URL
    tailor/              ← Steps 1–4: select → score → Q&A
    tailor/[id]/         ← Step 5: results, diff, export

  api/
    resume/parse/        ← Upload → extract text → Claude PROMPT 1
    jobs/fetch-url/      ← Scrape Greenhouse / Lever / Ashby / generic
    jobs/analyze/        ← Claude PROMPT 2: extract structured job data
    tailor/score/        ← ATS score (no AI — pure algorithm)
    tailor/questions/    ← Claude PROMPT 3: gap questions
    tailor/generate/     ← Claude PROMPT 4: tailored resume + diff
    tailor/cover-letter/ ← Claude PROMPT 5: streaming cover letter
    export/pdf/          ← @react-pdf/renderer → Supabase Storage
    export/docx/         ← docx → Supabase Storage

components/
  shared/   ← Sidebar, MobileNav, LoadingStates
  resume/   ← ResumeUploader, ResumeParser, ResumeEditor, ResumeCard
  jobs/     ← JobURLInput, JobCard
  tailor/   ← TailorStepper, MatchScore, QuestionFlow, TailorDiff, CoverLetter

lib/
  ai/       ← All 5 Claude prompts + extractJSON() guard
  scoring/  ← ATS scorer (keyword/skill/exp/format/edu weighted)
  export/   ← PDF + DOCX generators
  jobs/     ← Job scraper (Greenhouse JSON API, Lever, Ashby, generic)
  supabase/ ← Browser client + server client (cookie-based)

store/      ← Zustand tailor flow state machine (steps 1–5)
types/      ← Shared TypeScript types across the whole app
proxy.ts    ← Auth redirect middleware (unauthenticated → /login)
```

---

## Database Schema

Five tables, all with RLS (row-level security — users only see their own data):

| Table | Purpose |
|---|---|
| `profiles` | User metadata, auto-created on signup via trigger |
| `resumes` | Uploaded resumes with extracted structured data |
| `resume_enhancements` | Q&A answers from the gap-fill flow |
| `jobs` | Job descriptions (pasted or scraped) |
| `tailored_resumes` | Generated resumes with diff, score, cover letter, export URLs |

Storage buckets:
- `resumes` — original uploaded files
- `exports` — generated PDFs and DOCX files

Both buckets are private with per-user folder RLS.

---

## ATS Scoring

The score is calculated with no AI — it's a deterministic algorithm:

| Signal | Weight |
|---|---|
| Keyword match | 35% |
| Skill match | 25% |
| Experience match | 20% |
| Format quality | 15% |
| Education match | 5% |

Score is shown before tailoring (so you can see the gap) and after (so you can see the improvement).

---

## AI Prompts

Five Claude calls per full session, ~$0.08–0.12 total at Sonnet pricing:

1. **Resume Parser** — extracts structured resume data (contact, summary, experience, education, skills) from raw text
2. **Job Analyzer** — extracts required skills, nice-to-haves, red flags, and a plain-English summary from JD text
3. **Question Generator** — identifies gaps between resume and job, generates 3–5 targeted questions
4. **Resume Tailor** — merges answers into a new resume, outputs structured diff (what changed and why)
5. **Cover Letter** — streaming, personalized to the specific role, editable in TipTap

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Install and Run

```bash
npm install
npx next dev
```

App runs at `http://localhost:3000`.

### Database Setup

Run the migration in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor. This creates all tables, enables RLS, sets up policies, and creates the auto-profile trigger.

Then create two private storage buckets in the Supabase Dashboard:
- `resumes`
- `exports`

For both, set the RLS policy: `auth.uid()::text = (storage.foldername(name))[1]`

---

## Design Direction

- **Background:** Deep navy (`#0A0F1E`)
- **Success / scores:** Green (`#22C55E`)
- **AI actions:** Purple (`#8B5CF6`)
- **Warnings:** Amber
- **Mobile:** Bottom nav bar, full-screen flow steps, 44px minimum tap targets
- **Desktop:** Sidebar with labels, split-screen on tailor results (original | tailored)
- **Animation:** Framer Motion page transitions (slide between steps), score counter animation on results

---

## Roadmap

### v1 — Now
- [x] Auth (email + Google)
- [x] Resume upload (PDF + DOCX)
- [x] Resume parsing with Claude
- [x] Job description input (paste or URL)
- [x] ATS score
- [x] Gap-fill Q&A flow
- [x] Tailored resume generation with diff
- [x] Streaming cover letter
- [x] PDF + DOCX export

### v2 — Planned
- [ ] Job search and discovery
- [ ] Company research and outreach strategy
- [ ] Interview prep (STAR method, common questions per role)
- [ ] Application tracker

---

## Why This Exists

Built by a CS grad who needed it.

The frustrating truth about job hunting is that you can be genuinely qualified for a role and still get filtered out before a human sees your name — not because you lack the experience, but because your resume doesn't use the same vocabulary as the job description. ATS systems aren't reading your resume the way a person would. They're pattern matching. And if your resume says "built web services" but the job description says "RESTful API development with microservices," you're invisible.

The answer isn't to lie or pad your resume with buzzwords. The answer is to actually surface and communicate what you've done in the language that matters for the role you want.

That's what HireIQ does. It asks you questions. You answer honestly. It writes the resume. The job market doesn't reward the most qualified — it rewards the best-communicated. HireIQ closes that gap.
