export function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  if (fence) return fence[1]
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) return text.slice(start, end + 1)
  return text
}

export const RESUME_PARSER_PROMPT = `You are an expert resume parser. Extract the resume content into structured JSON.

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
      "bullets": [""],
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
}`

export const JOB_ANALYZER_PROMPT = `You are an expert recruiter. Analyze this job description and extract key requirements.

JOB DESCRIPTION:
{jobDescription}

Return ONLY valid JSON:
{
  "title": "",
  "company": "",
  "required_skills": [],
  "preferred_skills": [],
  "required_experience_years": 0,
  "education_requirement": "",
  "keywords": [],
  "responsibilities": [],
  "ats_system": "",
  "red_flags": [],
  "company_values": [],
  "compensation": {
    "min": null,
    "max": null,
    "currency": "USD",
    "period": "annual"
  },
  "work_type": "remote|hybrid|onsite",
  "seniority": "intern|junior|mid|senior|lead|staff|principal",
  "summary": ""
}`

export const QUESTION_GENERATOR_PROMPT = `You are a career coach helping a job seeker strengthen their resume for a specific job.

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
      "why_it_matters": "",
      "example_answer": ""
    }
  ]
}`

export const RESUME_TAILOR_PROMPT = `You are an expert resume writer and career coach. Rewrite this resume to maximize chances of getting an interview for this specific job.

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
  "contact": {},
  "summary": "",
  "experience": [],
  "education": [],
  "skills": {},
  "projects": [],
  "certifications": [],
  "volunteer": [],
  "awards": [],
  "tailoring_notes": [
    {
      "section": "",
      "change": "",
      "reason": ""
    }
  ]
}`

export const COVER_LETTER_PROMPT = `You are an expert cover letter writer. Write a compelling, personalized cover letter.

CANDIDATE INFO:
{candidateInfo}

TARGET JOB:
{jobAnalysis}

STRONGEST RELEVANT EXPERIENCES:
{topExperiences}

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
  "subject_line": "",
  "cover_letter": "",
  "keywords_used": [],
  "word_count": 0,
  "tone": "professional|conversational|enthusiastic"
}`
