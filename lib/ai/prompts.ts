export function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  if (fence) return fence[1].trim()
  const objStart = text.indexOf('{')
  const arrStart = text.indexOf('[')
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart)
  if (start === -1) return text
  const close = text[start] === '[' ? ']' : '}'
  const end = text.lastIndexOf(close)
  if (end !== -1 && end > start) return text.slice(start, end + 1)
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

export const GAP_ANALYSIS_PROMPT = `You are a rigorous career analyst comparing a candidate's profile to a job description.

CANDIDATE PROFILE (resume + experience — treat as complete unless Q&A adds more):
{structuredResume}

GITHUB PROJECT CONTEXT (synced repos — README, stack, structure; use for Tier 1/2 evidence):
{githubContext}

TARGET JOB REQUIREMENTS:
{jobRequirements}

ATS GAP SIGNALS (deterministic pre-scan — use as hints, verify against profile):
{gaps}

Produce a THREE-TIER gap analysis:

TIER 1 — DIRECT MATCH: Candidate has clear evidence. Cite specific bullet, project, or skill.
TIER 2 — ADJACENT MATCH: Not exact, but honestly close. Before classifying adjacent, ALL must be true:
  1) Real work, code, or study demonstrates the underlying concept
  2) A reasonable interviewer would agree the connection is honest
  3) Candidate could answer "tell me about your X experience" truthfully
  Include honest_framing for how to describe it accurately (e.g. "X-adjacent", "similar to X").
TIER 3 — REAL GAP: Genuinely missing. Never suggest claiming it. Note why.

QUESTIONS (max 3, only if Tier 2/3 cannot be resolved from profile alone):
- Ask ONLY about specific tools/experiences that might exist but aren't documented
- NEVER ask what's already in the profile
- NEVER ask generic "tell me about yourself" questions
- Each question needs: id, question, category, gap_being_filled, why_it_matters, choices (2-4), example_answer

Return ONLY valid JSON:
{
  "direct_matches": [
    { "jd_requirement": "", "user_evidence": "", "source": "resume|project|skill" }
  ],
  "adjacent_matches": [
    { "jd_requirement": "", "user_evidence": "", "honest_framing": "" }
  ],
  "real_gaps": [
    { "jd_requirement": "", "note": "" }
  ],
  "questions_for_user": [
    {
      "id": "q1",
      "question": "",
      "category": "experience|skills|projects|education|achievement",
      "gap_being_filled": "",
      "why_it_matters": "",
      "choices": ["", ""],
      "example_answer": ""
    }
  ]
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
6. NEVER assume the candidate has done something — ask if they have (honesty: ask first, never invent)
7. Ground every question in THIS candidate's real profile — reference their actual roles,
   tools, or projects so it never feels generic.

For EACH question also provide:
- "choices": 2-4 short, realistic answer options the candidate can tap instead of typing.
  Make them plausible given the profile (e.g. "Yes — at [their company]", "Used it on a side project",
  "Not yet"). The user can still type their own answer, so choices are shortcuts, not the only path.
- "example_answer": one concrete, well-written example answer (1-2 sentences) that shows the
  candidate exactly how a strong, specific, honest answer reads.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "",
      "category": "experience|skills|projects|education|achievement",
      "gap_being_filled": "",
      "why_it_matters": "",
      "choices": ["", ""],
      "example_answer": ""
    }
  ]
}`

export const TAILOR_GENERATE_PROMPT = `You are an expert resume writer. Tailor this resume for ONE specific job using ONLY real evidence from the candidate's profile and Q&A answers.

ORIGINAL RESUME (master — do not invent beyond this + Q&A):
{structuredResume}

GITHUB PROJECT CONTEXT (synced repos — use for honest project bullets & skills):
{githubContext}

TARGET JOB ANALYSIS:
{jobAnalysis}

USER Q&A (new evidence — incorporate truthfully):
{enhancements}

REAL GAPS — NEVER fabricate, imply, or keyword-stuff these requirements:
{realGaps}

ADJACENT MATCHES — use ONLY with the honest framing provided (no stronger claims):
{adjacentMatches}

RULES (honesty spine):
1. NEVER fabricate experience, skills, metrics, or employers.
2. Map job success language to the closest REAL bullet or Q&A answer.
3. Reframe weak-but-true bullets in the company's vocabulary — no new claims.
4. Full restructure allowed in this tailored snapshot only: reorder sections/bullets, drop weak irrelevant bullets, merge duplicates.
5. Length budget: {lengthBudget} — prioritize strongest relevant content; never pad to fill.
6. Start bullets with strong action verbs; quantify only when the source material supports it.
7. Reorder skills with most job-relevant first.
8. Rewrite summary to speak directly to this role.

TARGET ATS: {atsSystem}
SENIORITY: {seniority}

Return ONLY valid JSON — same structure as the original resume plus tailoring_notes:
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
  "tailoring_notes": [{ "section": "", "change": "", "reason": "" }]
}`

/** @deprecated Use TAILOR_GENERATE_PROMPT */
export const RESUME_TAILOR_PROMPT = TAILOR_GENERATE_PROMPT

export const TAILOR_CRITIQUE_PROMPT = `You are TWO judges reviewing a tailored resume against a job description.

JUDGE 1 — ATS parser: What % of the job's success phrases and required keywords are credibly present in the resume? (0-100)

JUDGE 2 — Skeptical human recruiter: Flag unsupported claims, vague bullets, generic filler, robotic phrasing.

ORIGINAL MASTER RESUME:
{structuredResume}

TAILORED DRAFT:
{tailoredResume}

JOB ANALYSIS:
{jobAnalysis}

Return ONLY valid JSON:
{
  "language_overlap_percent": 0,
  "ats_pass": true,
  "human_pass": true,
  "flags": [
    {
      "type": "unsupported_claim|vague|generic|robotic",
      "section": "summary|experience|skills|projects|education",
      "field": "bullets|text",
      "expId": "optional",
      "detail": ""
    }
  ],
  "weak_sections": ["summary", "experience:exp_1"],
  "suggestions": ["short actionable fix"]
}

Gate rules you apply:
- unsupported_claim flags are serious — any unsupported claim means human_pass should be false.
- weak_sections lists sections that need targeted rewrite (use experience:ID for specific roles).`

export const TAILOR_REGENERATE_PROMPT = `Regenerate ONLY the weak sections of this tailored resume. Keep all other sections identical.

WEAK SECTIONS TO FIX:
{weakSections}

CRITIQUE FLAGS:
{critiqueFlags}

FIX SUGGESTIONS:
{suggestions}

ORIGINAL MASTER (source of truth — no fabrication):
{structuredResume}

CURRENT TAILORED DRAFT:
{tailoredResume}

JOB ANALYSIS:
{jobAnalysis}

Q&A EVIDENCE:
{enhancements}

REAL GAPS — do not fabricate:
{realGaps}

ADJACENT MATCHES — honest framing only:
{adjacentMatches}

Return ONLY valid JSON with the FULL resume structure (all sections), fixing only the weak areas:
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
  "tailoring_notes": [{ "section": "", "change": "", "reason": "" }]
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

export const AUTOFILL_DRAFTS_PROMPT = `You draft short answers for empty job-application form fields.

RESUME CONTEXT:
{resumeContext}

KNOWN SENSITIVE FACTS (only use these for sensitive legal/EEOC/salary/work-auth fields — never invent):
{knownSensitiveFacts}

TARGET JOB:
Title: {jobTitle}
Company: {jobCompany}
Description snippet:
{jobDescription}

FIELDS TO DRAFT (JSON):
{fieldsJson}

RULES:
1. Return ONLY a JSON array (no markdown, no explanation). One object per field key.
2. Each object: { "key": string, "answer": string, "lasting": boolean, "skip": boolean, "skipReason": string }
3. Skip file upload fields (set skip:true, skipReason:"file field").
4. For sensitive fields (race, ethnicity, gender, sex, veteran, disability, LGBT, religion, conviction/criminal, salary/compensation/wage, work authorization/visa/citizenship/sponsorship, SSN, DOB/age):
   - If a matching fact appears in KNOWN SENSITIVE FACTS, answer from that fact only.
   - Otherwise skip:true with skipReason explaining the fact is not in the profile (never invent).
5. Ground non-sensitive answers in RESUME CONTEXT + job title/company/JD. Do not fabricate employers, degrees, or years.
6. lasting:true only for career facts (skills, years experience, tools, languages, education, work auth). lasting:false for "why this company/role", cover letters, availability/start dates.
7. Keep answers concise (1–3 sentences max; short phrases for skills/YOE).
8. If you cannot ground an answer, skip:true with a short skipReason.`
