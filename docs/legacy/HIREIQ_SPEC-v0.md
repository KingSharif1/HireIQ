# HireIQ — Complete Project Spec
## "The Job Search OS That Actually Gets You Hired"

> **⚠️ Legacy document (v0).** Superseded by [SPEC.md](../SPEC.md) v1.0. For current build status see [STATUS.md](../STATUS.md). Auth uses `proxy.ts` (Next.js 16), not `middleware.ts`.

---

## 1. PRODUCT OVERVIEW

HireIQ is a mobile-first web app that gives job seekers the best possible chance of getting a callback — not just by tailoring resumes, but by guiding every step of the job search: parse resume → match to jobs → fill gaps via Q&A → tailor resume + cover letter → get outreach strategy → track applications → prep for interviews.

**Core Insight from Research:**
- 1 in 5 job listings is a ghost job (never filled)
- Referred candidates get interviews at 40x the rate of cold applicants
- Resumes only cover ~41% of required JD keywords on first submission
- ATS does NOT auto-reject — humans reject after volume filtering
- A cover letter increases interview odds by ~1.9x

---

## 2. TECH STACK

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **File Upload**: react-dropzone
- **PDF Viewer**: react-pdf
- **Charts**: Recharts
- **Rich Text Editor**: TipTap (for resume editing)

### Backend
- **API**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL) — use for auth, DB, storage, realtime
- **File Storage**: Supabase Storage (resume PDFs/DOCX)
- **Queue**: Supabase Edge Functions (for async AI jobs)
- **Caching**: Redis via Upstash (job listings cache, rate limiting)

### AI Stack
- **Resume Parsing**: Claude claude-sonnet-4-20250514 (best at structured extraction)
- **Job Analysis**: Claude claude-sonnet-4-20250514 (nuanced understanding)
- **ATS Scoring**: Pure logic/algorithm (NOT AI — needs consistency)
- **Gap Questions**: Claude claude-sonnet-4-20250514 (conversational, context-aware)
- **Resume Tailoring**: Claude claude-sonnet-4-20250514 (follows instructions, won't hallucinate)
- **Cover Letter**: Claude claude-sonnet-4-20250514
- **Outreach Strategy**: Claude claude-sonnet-4-20250514
- **Interview Prep**: Claude claude-sonnet-4-20250514
- **Job Scraping**: Web fetch + Cheerio (Greenhouse/Lever/Ashby public APIs)

### External APIs
- **Greenhouse Jobs API**: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs`
- **Lever Postings API**: `https://api.lever.co/v0/postings/{company}?mode=json`
- **Ashby Jobs API**: `https://api.ashbyhq.com/posting-api/job-board/{company}`
- **Adzuna API**: For broad job discovery (free tier)
- **HN Firebase API**: For monthly "Who's Hiring" thread

### Infrastructure
- **Hosting**: Vercel
- **Auth**: Supabase Auth (email + Google OAuth)
- **Email**: Resend (transactional emails)
- **PDF Generation**: Puppeteer (server-side, Vercel serverless)
- **DOCX Generation**: docx.js

---

## 3. DATABASE SCHEMA

```sql
-- Users (handled by Supabase Auth, extended here)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  target_role TEXT,           -- "Frontend Developer"
  target_industries TEXT[],   -- ["Healthcare", "Fintech"]
  target_locations TEXT[],    -- ["Remote", "Austin, TX"]
  years_experience INT,
  min_salary INT,
  job_search_status TEXT,     -- "actively_looking" | "open" | "not_looking"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base Resumes (user's master resume)
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,               -- "My Software Engineer Resume"
  original_file_url TEXT,            -- Supabase Storage URL
  original_file_type TEXT,           -- "pdf" | "docx"
  raw_text TEXT,                     -- Extracted plain text
  structured_data JSONB NOT NULL,    -- Parsed resume sections
  ats_format_score INT,              -- 0-100 format compliance score
  is_primary BOOLEAN DEFAULT false,  -- User's main resume
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resume Enhancement History (answers from Q&A flow)
CREATE TABLE resume_enhancements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,     -- "experience" | "skills" | "projects" | "education"
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  applied_to_resume BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs (cached from APIs + user-pasted)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,                  -- ID from source API
  source TEXT NOT NULL,              -- "greenhouse" | "lever" | "ashby" | "manual" | "adzuna"
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  remote_type TEXT,                  -- "remote" | "hybrid" | "onsite"
  salary_min INT,
  salary_max INT,
  apply_url TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  is_ghost_risk BOOLEAN DEFAULT false, -- flagged if >30 days or no salary
  extracted_data JSONB,              -- {required_skills, nice_to_have, keywords, ...}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications (user's job applications)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id),
  resume_id UUID REFERENCES resumes(id),
  tailored_resume_id UUID REFERENCES tailored_resumes(id),
  status TEXT DEFAULT 'saved',
  -- 'saved' | 'applying' | 'applied' | 'phone_screen' |
  -- 'interview' | 'final_round' | 'offer' | 'rejected' | 'ghosted'
  match_score INT,                   -- 0-100 ATS score
  applied_at TIMESTAMPTZ,
  notes TEXT,
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tailored Resumes (job-specific versions)
CREATE TABLE tailored_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  base_resume_id UUID REFERENCES resumes(id),
  job_id UUID REFERENCES jobs(id),
  structured_data JSONB NOT NULL,   -- Tailored resume content
  changes JSONB,                    -- Diff: what was changed from base
  cover_letter TEXT,                -- Generated cover letter
  match_score INT,                  -- Score before tailoring
  tailored_score INT,               -- Score after tailoring
  pdf_url TEXT,                     -- Generated PDF in Supabase Storage
  docx_url TEXT,                    -- Generated DOCX in Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Contacts (people to reach out to at target companies)
CREATE TABLE outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  title TEXT,
  linkedin_url TEXT,
  email TEXT,
  outreach_template TEXT,          -- AI-generated message
  status TEXT DEFAULT 'pending',   -- 'pending' | 'sent' | 'responded' | 'ignored'
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. PROJECT FOLDER STRUCTURE

```
hireiq/
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Dashboard shell w/ sidebar
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── resume/
│   │   │   ├── page.tsx             # Resume list
│   │   │   ├── upload/page.tsx      # Upload + parse flow
│   │   │   └── [id]/page.tsx        # View/edit resume
│   │   ├── jobs/
│   │   │   ├── page.tsx             # Job discovery feed
│   │   │   └── [id]/page.tsx        # Job detail + tailor
│   │   ├── tailor/
│   │   │   ├── page.tsx             # Tailor flow start
│   │   │   └── [id]/page.tsx        # Tailored resume result
│   │   ├── applications/
│   │   │   └── page.tsx             # Application tracker (kanban)
│   │   └── interview/
│   │       └── page.tsx             # Interview prep
│   └── api/
│       ├── resume/
│       │   ├── upload/route.ts      # POST: Upload + parse
│       │   ├── parse/route.ts       # POST: Extract structured data
│       │   └── enhance/route.ts     # POST: Apply Q&A answers
│       ├── jobs/
│       │   ├── search/route.ts      # GET: Search job listings
│       │   ├── fetch-url/route.ts   # POST: Scrape job from URL
│       │   └── analyze/route.ts     # POST: Extract job requirements
│       ├── tailor/
│       │   ├── score/route.ts       # POST: Calculate ATS match score
│       │   ├── questions/route.ts   # POST: Generate gap questions
│       │   ├── generate/route.ts    # POST: Generate tailored resume
│       │   └── cover-letter/route.ts # POST: Generate cover letter
│       ├── outreach/
│       │   └── generate/route.ts   # POST: Generate outreach strategy
│       └── export/
│           ├── pdf/route.ts        # POST: Export as PDF
│           └── docx/route.ts       # POST: Export as DOCX
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── resume/
│   │   ├── ResumeUploader.tsx      # Drag & drop upload
│   │   ├── ResumeParser.tsx        # Parsing progress + result
│   │   ├── ResumeEditor.tsx        # Edit parsed sections
│   │   ├── ResumeCard.tsx          # Card in resume list
│   │   └── ResumeViewer.tsx        # Side-by-side PDF viewer
│   ├── jobs/
│   │   ├── JobFeed.tsx             # Scrollable job list
│   │   ├── JobCard.tsx             # Individual job card
│   │   ├── JobDetail.tsx           # Full job view
│   │   └── JobURLInput.tsx         # Paste URL to scrape
│   ├── tailor/
│   │   ├── MatchScore.tsx          # Circular score + breakdown
│   │   ├── QuestionFlow.tsx        # AI Q&A interface
│   │   ├── TailorDiff.tsx          # Before/after comparison
│   │   ├── CoverLetter.tsx         # Cover letter editor
│   │   └── OutreachStrategy.tsx    # Who to contact + templates
│   ├── applications/
│   │   ├── KanbanBoard.tsx         # Status tracking board
│   │   ├── ApplicationCard.tsx     # Draggable card
│   │   └── StatusUpdater.tsx       # Quick status update
│   └── shared/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       ├── MobileNav.tsx
│       └── LoadingStates.tsx
│
├── lib/
│   ├── ai/
│   │   ├── prompts.ts              # All AI prompts (centralized)
│   │   ├── resume-parser.ts        # Resume parsing logic
│   │   ├── job-analyzer.ts         # Job description analysis
│   │   ├── question-generator.ts   # Gap question generation
│   │   ├── resume-tailor.ts        # Tailoring logic
│   │   └── cover-letter.ts         # Cover letter generation
│   ├── scoring/
│   │   ├── ats-scorer.ts           # ATS scoring algorithm
│   │   ├── keyword-extractor.ts    # Extract keywords from JD
│   │   └── skill-matcher.ts        # Match skills between resume/JD
│   ├── jobs/
│   │   ├── greenhouse.ts           # Greenhouse API client
│   │   ├── lever.ts                # Lever API client
│   │   ├── ashby.ts                # Ashby API client
│   │   ├── adzuna.ts               # Adzuna API client
│   │   └── job-scraper.ts          # Scrape job URL
│   ├── export/
│   │   ├── pdf-generator.ts        # Puppeteer PDF generation
│   │   └── docx-generator.ts       # docx.js generation
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client
│   │   └── proxy.ts                # Auth proxy (Next.js 16; was middleware.ts)
│   └── utils.ts
│
├── hooks/
│   ├── useResume.ts
│   ├── useJobs.ts
│   ├── useTailor.ts
│   └── useApplications.ts
│
├── store/
│   └── index.ts                    # Zustand store
│
├── types/
│   └── index.ts                    # All TypeScript types
│
└── supabase/
    ├── migrations/                 # DB migrations
    └── functions/                  # Edge functions
```

---

## 5. ALL AI PROMPTS

### PROMPT 1: Resume Parser
```typescript
const RESUME_PARSER_PROMPT = `You are an expert resume parser. Extract the resume content into structured JSON.

RESUME TEXT:
{resumeText}

Return ONLY valid JSON (no markdown, no explanation):
{
  "contact": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "website": ""
  },
  "summary": "",
  "experience": [
    {
      "id": "exp_1",
      "company": "",
      "title": "",
      "location": "",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY or Present",
      "current": false,
      "bullets": ["", ""],
      "skills_used": [""]
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "institution": "",
      "degree": "",
      "field": "",
      "startDate": "YYYY",
      "endDate": "YYYY",
      "gpa": "",
      "relevant_courses": [],
      "honors": []
    }
  ],
  "skills": {
    "technical": [""],
    "soft": [""],
    "tools": [""],
    "languages": [""]
  },
  "projects": [
    {
      "id": "proj_1",
      "name": "",
      "description": "",
      "bullets": [""],
      "technologies": [""],
      "url": "",
      "github": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date": "",
      "url": ""
    }
  ],
  "volunteer": [],
  "awards": []
}`;
```

### PROMPT 2: Job Description Analyzer
```typescript
const JOB_ANALYZER_PROMPT = `You are an expert recruiter. Analyze this job description and extract key requirements.

JOB DESCRIPTION:
{jobDescription}

Return ONLY valid JSON:
{
  "title": "",
  "company": "",
  "required_skills": [""],         // Must-have technical skills
  "preferred_skills": [""],        // Nice-to-have skills
  "required_experience_years": 0,  // Minimum years required
  "education_requirement": "",     // "bachelor" | "master" | "phd" | "none"
  "keywords": [""],                // Important terms/phrases from JD
  "responsibilities": [""],        // Main job duties
  "ats_system": "",                // Detected ATS if in URL: greenhouse/lever/ashby/workday
  "red_flags": [""],               // Warning signs (e.g., "10+ years for junior role")
  "company_values": [""],          // Mentioned culture/values
  "compensation": {
    "min": null,
    "max": null,
    "currency": "USD",
    "period": "annual"
  },
  "work_type": "remote|hybrid|onsite",
  "seniority": "intern|junior|mid|senior|lead|staff|principal",
  "summary": ""                    // 2-3 sentence plain English summary of role
}`;
```

### PROMPT 3: Gap Question Generator
```typescript
const QUESTION_GENERATOR_PROMPT = `You are a career coach helping a job seeker strengthen their resume for a specific job.

CANDIDATE'S RESUME:
{structuredResume}

TARGET JOB REQUIREMENTS:
{jobRequirements}

IDENTIFIED GAPS:
{gaps}

Generate 3-5 questions that will help fill these gaps. Questions should:
1. Be specific and actionable (not generic like "tell me about yourself")
2. Help uncover relevant experience they may have forgotten to include
3. Be answerable in 2-4 sentences
4. Focus on the biggest gaps first
5. Be conversational and encouraging in tone

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "",
      "category": "experience|skills|projects|education|achievement",
      "gap_being_filled": "",
      "why_it_matters": "",         // Brief explanation for the user
      "example_answer": ""          // Example of a good answer (hidden from user initially)
    }
  ]
}`;
```

### PROMPT 4: Resume Tailor
```typescript
const RESUME_TAILOR_PROMPT = `You are an expert resume writer and career coach. Rewrite this resume to maximize chances of getting an interview for this specific job.

ORIGINAL RESUME:
{structuredResume}

TARGET JOB:
{jobAnalysis}

USER'S NEW INFORMATION (from Q&A):
{enhancements}

TAILORING INSTRUCTIONS:
1. Incorporate all new information from user's Q&A answers naturally
2. Rewrite experience bullets to highlight relevance to this role
3. Use EXACT keywords from the job description (ATS optimization)
4. Start every bullet with a strong action verb (Built, Led, Designed, etc.)
5. Quantify achievements wherever possible (%, $, users, time saved)
6. Keep bullets under 2 lines each
7. Reorder skills to put most relevant first
8. Update summary to speak directly to this role
9. DO NOT invent or exaggerate any information
10. DO NOT remove anything that was in the original resume
11. Maintain authentic voice throughout

TARGET ATS SYSTEM: {atsSystem}
SENIORITY LEVEL: {seniority}

Return the complete tailored resume in the exact same JSON structure as the original, plus:
{
  ...originalStructure,
  "tailoring_notes": [
    {
      "section": "",
      "change": "",
      "reason": ""
    }
  ]
}`;
```

### PROMPT 5: Cover Letter Generator
```typescript
const COVER_LETTER_PROMPT = `You are an expert cover letter writer. Write a compelling, personalized cover letter.

CANDIDATE INFO:
{candidateInfo}

TARGET JOB:
{jobAnalysis}

STRONGEST RELEVANT EXPERIENCES:
{topExperiences}

USER'S KEY SELLING POINTS:
{keyPoints}

COVER LETTER REQUIREMENTS:
1. Open with a specific hook about the company (not "I am excited to apply")
2. Address the hiring manager if name is known, otherwise "Hiring Team"
3. Paragraph 1: Hook + why THIS company specifically
4. Paragraph 2: Strongest relevant achievement (quantified)
5. Paragraph 3: Second achievement + skill match
6. Paragraph 4: Brief cultural fit + forward-looking close
7. Max 350 words total
8. Sound human, not AI-generated
9. Mirror 3-4 keywords from the job description naturally
10. End with a clear call to action

Return ONLY valid JSON:
{
  "subject_line": "",          // For email applications
  "cover_letter": "",          // Full text, plain paragraphs
  "keywords_used": [""],       // JD keywords included
  "word_count": 0,
  "tone": "professional|conversational|enthusiastic"
}`;
```

### PROMPT 6: Outreach Strategy Generator
```typescript
const OUTREACH_STRATEGY_PROMPT = `You are a career networking expert. Create a targeted outreach strategy for this job application.

CANDIDATE BACKGROUND:
{candidateSummary}

TARGET JOB:
{jobDetails}

TAILORED RESUME HIGHLIGHTS:
{topStrengths}

Create an outreach strategy. Return ONLY valid JSON:
{
  "strategy_summary": "",          // 2-3 sentence overview of approach
  "target_contacts": [
    {
      "role": "",                  // e.g., "Engineering Manager", "Recruiter", "Software Engineer"
      "why_target": "",            // Why this person is most valuable to reach
      "where_to_find": "",         // LinkedIn search tip, department page, etc.
      "priority": "high|medium|low"
    }
  ],
  "linkedin_message": {
    "connection_request": "",      // <300 char connection note
    "follow_up_message": "",       // If they connect but don't respond
    "subject_line": ""             // If using LinkedIn InMail
  },
  "email_template": {
    "subject": "",
    "body": "",                    // <120 words
    "follow_up_day_3": "",         // Brief follow-up
    "follow_up_day_10": ""         // Final follow-up
  },
  "communities": [
    {
      "name": "",                  // Slack/Discord/community name
      "why": "",                   // Why relevant for this role/company
      "how_to_use": ""             // How to get a referral from there
    }
  ],
  "timeline": [
    {
      "day": 0,
      "action": "",
      "channel": "linkedin|email|community"
    }
  ],
  "key_message": ""                // The one thing to emphasize in every touchpoint
}`;
```

### PROMPT 7: Interview Prep Generator
```typescript
const INTERVIEW_PREP_PROMPT = `You are an expert interview coach. Create a personalized interview prep plan.

CANDIDATE'S TAILORED RESUME:
{tailoredResume}

JOB DESCRIPTION:
{jobAnalysis}

Generate interview prep materials. Return ONLY valid JSON:
{
  "likely_questions": [
    {
      "question": "",
      "type": "behavioral|technical|situational|culture",
      "why_theyll_ask": "",
      "suggested_answer_framework": "",   // STAR, etc.
      "candidate_relevant_story": "",     // Based on their resume
      "what_to_avoid": ""
    }
  ],
  "technical_topics": [
    {
      "topic": "",
      "importance": "high|medium|low",
      "study_suggestion": ""
    }
  ],
  "questions_to_ask_them": [
    {
      "question": "",
      "why_ask": ""
    }
  ],
  "red_flags_to_address": [
    {
      "concern": "",               // What they might question
      "how_to_address": ""         // How to proactively handle it
    }
  ],
  "salary_negotiation": {
    "market_range": "",
    "suggested_anchor": "",
    "negotiation_script": ""
  }
}`;
```

---

## 6. ATS SCORING ALGORITHM

```typescript
// lib/scoring/ats-scorer.ts

export interface ATSScore {
  total: number;           // 0-100
  breakdown: {
    keywords: number;      // 0-100
    skills: number;        // 0-100
    experience: number;    // 0-100
    format: number;        // 0-100
    education: number;     // 0-100
  };
  matched_keywords: string[];
  missing_keywords: string[];
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

export function calculateATSScore(resume, job): ATSScore {
  const keywordScore = calculateKeywordScore(resume, job);    // 35%
  const skillScore = calculateSkillScore(resume, job);        // 25%
  const expScore = calculateExperienceScore(resume, job);     // 20%
  const formatScore = calculateFormatScore(resume);           // 15%
  const eduScore = calculateEducationScore(resume, job);      // 5%

  const total = Math.round(
    keywordScore.score * 0.35 +
    skillScore.score * 0.25 +
    expScore.score * 0.20 +
    formatScore.score * 0.15 +
    eduScore.score * 0.05
  );

  return {
    total,
    breakdown: {
      keywords: keywordScore.score,
      skills: skillScore.score,
      experience: expScore.score,
      format: formatScore.score,
      education: eduScore.score,
    },
    matched_keywords: keywordScore.matched,
    missing_keywords: keywordScore.missing,
    matched_skills: skillScore.matched,
    missing_skills: skillScore.missing,
    recommendations: generateRecommendations(total, { keywordScore, skillScore, expScore, formatScore }),
  };
}
```

---

## 7. USER FLOWS

### Flow 1: Upload & Parse Resume
1. User drops PDF/DOCX on upload zone
2. File uploads to Supabase Storage
3. Server extracts text (pdf-parse or mammoth)
4. Claude parses text → structured JSON
5. User sees parsed sections (contact, experience, skills, etc.)
6. User can edit any section inline
7. Format compliance score shown (ATS readiness)
8. "Enhancement Questions" offered optionally

### Flow 2: Paste Job Description / URL
1. User pastes URL or raw text
2. If URL: server fetches page, extracts job content
3. Claude analyzes JD → requirements JSON
4. Show: role summary, required skills, seniority level
5. Detect ATS system from URL
6. Show ghost job risk warning if applicable

### Flow 3: Tailor Resume
1. User selects base resume + job
2. System calculates initial ATS match score
3. Show score breakdown + missing keywords/skills
4. Claude generates 3-5 gap questions
5. User answers questions (can skip or elaborate)
6. System stores answers to resume history
7. Claude generates tailored resume
8. Side-by-side diff shown (what changed)
9. New ATS score shown (before → after)
10. Claude generates cover letter
11. User can edit both inline
12. Export as PDF or DOCX

### Flow 4: Application Tracker
1. User saves job to tracker from any screen
2. Set initial status (saved/applying/applied)
3. Manual status updates via kanban drag or dropdown
4. Notes field per application
5. Follow-up reminder date
6. See outreach status per application

### Flow 5: Outreach Strategy
1. After tailoring, "Get More Interviews" CTA appears
2. Claude generates: who to contact, what to say, where to find them
3. LinkedIn message templates (connection request + follow-up)
4. Email templates (3-touch sequence)
5. Relevant communities to join
6. 7-day action timeline

---

## 8. MOBILE-FIRST RESPONSIVE DESIGN

### Mobile (< 768px)
- Bottom navigation bar (5 tabs: Home, Resume, Jobs, Applications, Profile)
- Full-screen flows (one step per screen)
- Swipe gestures on job cards (save/skip)
- Large tap targets (min 44px)
- Sticky CTAs at bottom of screens
- Collapsible sections in resume view

### Tablet (768px - 1024px)
- Side navigation (icons only)
- 2-column layouts where appropriate
- Resume + job side by side

### Desktop (> 1024px)
- Full sidebar with labels
- 3-column layout on dashboard
- Split-screen tailor view (original | tailored)
- Hover tooltips with extra detail
- Keyboard shortcuts
- More data in tables/charts

---

## 9. ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=

# Job APIs
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# Email
RESEND_API_KEY=

# Cache
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 10. BUILD PHASES

### Phase 1 (Week 1-2): Foundation
- [ ] Next.js project setup with Tailwind + shadcn/ui
- [ ] Supabase setup (auth + schema migration)
- [ ] Resume upload + Claude parsing
- [ ] Basic resume viewer/editor
- [ ] Deploy to Vercel

### Phase 2 (Week 3-4): Core Tailor Flow
- [ ] Job description paste + URL scraping
- [ ] ATS scoring algorithm
- [ ] Gap question generation
- [ ] Resume tailoring with Claude
- [ ] Cover letter generation
- [ ] PDF/DOCX export

### Phase 3 (Week 5-6): Job Discovery
- [ ] Greenhouse/Lever/Ashby API integration
- [ ] Adzuna API for broad search
- [ ] Job feed with filters
- [ ] User preference matching
- [ ] Ghost job detection

### Phase 4 (Week 7-8): Applications + Outreach
- [ ] Kanban application tracker
- [ ] Outreach strategy generation
- [ ] LinkedIn/email templates
- [ ] Follow-up reminders
- [ ] Interview prep module

### Phase 5 (Week 9-10): Polish
- [ ] Mobile optimizations
- [ ] Performance (caching, lazy loading)
- [ ] Analytics (Posthog)
- [ ] Onboarding flow
- [ ] Launch on ProductHunt

---

## 11. KEY DIFFERENTIATORS vs. COMPETITORS

| Feature | HireIQ | Teal | Simplify | Kickresume |
|---------|--------|------|----------|------------|
| ATS scoring | ✅ Algorithmic | ✅ | ❌ | ❌ |
| Gap Q&A flow | ✅ | ❌ | ❌ | ❌ |
| Outreach strategy | ✅ | ❌ | ❌ | ❌ |
| Active hiring sources | ✅ | ❌ | ✅ | ❌ |
| Ghost job detection | ✅ | ❌ | ❌ | ❌ |
| Interview prep | ✅ | ❌ | ❌ | ❌ |
| Mobile-first | ✅ | ❌ | ❌ | ❌ |
| Free tier | ✅ | ✅ | ✅ | freemium |
