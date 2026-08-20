export { extractJSON } from '@/lib/ai/parse-json'

export const RESUME_PARSER_PROMPT = `You are an expert resume parser. Convert the resume into HireIQ markdown (not JSON). Extract EVERYTHING honest from the text — contact, summary, every role, every project, education, certifications, and skills.

RESUME TEXT:
{resumeText}

Return ONLY HireIQ markdown — no code fences, no commentary. Keep facts honest; do not invent employers, dates, or metrics. Prefer the candidate's wording.

Rules:
1. Skills MUST be categorized (not one comma wall):
   **Languages:** programming languages only (TypeScript, Python, …)
   **Frameworks & Tools:** frameworks, libraries, platforms
   **Cloud & Data:** cloud, DBs, DevOps (or omit if none)
   **Soft Skills:** only if clearly listed
2. Deduplicate skills across lines. Never repeat the same skill twice.
3. Education: one clean degree line — never "B.S. in Computer Science in Computer Science".
4. Keep every substantive experience and project from the source. Do not drop sections that exist in the text.
5. Preserve concrete tech names inside bullets when the source has them.
6. If a section is missing from the source, omit that heading entirely.

# Full Name
email · phone · location · links

## Summary
...

## Experience
### Title | Company | MM/YYYY – Present <!-- id:exp_1 -->
- bullet
Skills: tool1, tool2

## Projects
### Name <!-- id:proj_1 -->
description
- bullet
Tech: a, b

## Skills
**Languages:** ...
**Frameworks & Tools:** ...
**Cloud & Data:** ...

## Education
### Degree · Field · School <!-- id:edu_1 -->
YYYY – YYYY

## Certifications
- Name · Issuer · date
`

/** Used when the PDF has no usable text layer (scan / screenshot / image-only export). */
export const RESUME_VISION_PARSER_PROMPT = `You are an expert resume parser with OCR. The attached PDF may be a scan, screenshot, or image-only export (like Apple Live Text reading a photo). Read EVERY visible page carefully and convert it into HireIQ markdown.

Return ONLY HireIQ markdown — no code fences, no commentary. Keep facts honest; do not invent employers, dates, or metrics. Prefer the candidate's wording. If text is blurry, use the most likely reading; never fabricate sections that are not on the page.

Rules:
1. Skills MUST be categorized:
   **Languages:** …
   **Frameworks & Tools:** …
   **Cloud & Data:** …
2. Deduplicate skills. Clean education lines (never "Degree in Field in Field").
3. Extract all roles, projects, education, certs visible on the pages.
4. Preserve tech names in bullets when visible.

# Full Name
email · phone · location · links

## Summary
...

## Experience
### Title | Company | MM/YYYY – Present <!-- id:exp_1 -->
- bullet

## Projects
### Name <!-- id:proj_1 -->
- bullet
Tech: a, b

## Skills
**Languages:** ...
**Frameworks & Tools:** ...
**Cloud & Data:** ...

## Education
### Degree · Field · School <!-- id:edu_1 -->
YYYY – YYYY

## Certifications
- Name · Issuer · date
`

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

CANDIDATE PROFILE (HireIQ markdown — treat as complete unless Q&A adds more):
{resumeMarkdown}

SUPPLEMENTARY PROFILE CONTEXT (everything else we know — achievements, notes, saved answers, prior Q&A; use for evidence and smarter questions):
{profileContext}

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

QUESTIONS (1–3 — REQUIRED when ATS GAP SIGNALS lists missing skills/keywords):
- Returning [] is ONLY allowed when every ATS gap is already clearly documented in the profile, supplementary context, or GitHub context.
- Ask about specific tools/experiences that might exist off-resume (a class, internship, side project, or a bullet that never named the tool).
- Ground each question in THIS candidate (name their real company, project, or stack from the profile + supplementary context).
- NEVER ask what's already in the profile or supplementary context. NEVER ask generic "tell me about yourself".
- If they say no, we will not invent it. If they say yes, we can weave it in for ATS + the recruiter.
- Each question needs: id, question, category, gap_being_filled, why_it_matters, choices (2-4), example_answer

Return ONLY compact valid JSON (no markdown fences, no trailing commas). Keep arrays short: at most 8 direct_matches, 5 adjacent_matches, 5 real_gaps, 3 questions_for_user. Do not echo the resume.
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

export const TAILOR_GENERATE_PROMPT = `You are an expert resume writer competing with the best human resume editors (Teal / top career coaches). Your job is to maximize this candidate's chance of getting an interview for ONE specific role.

That means TWO audiences at once:
- ATS / keyword parsers: required skills and JD phrases must appear in real bullets and skills — not a keyword dump at the bottom.
- A human recruiter: professional, specific, scannable in 8 seconds, and still sounds like THIS person. No robotic stuffing, no fake metrics, no "synergy".

USE ALL HONEST DATA we give you: master resume, GitHub context, Q&A answers, achievements, volunteering when relevant. Prefer the strongest proof for THIS job. Never invent.

ORIGINAL RESUME (HireIQ markdown — keep <!-- id:... --> markers on roles/projects you keep):
{resumeMarkdown}

SUPPLEMENTARY PROFILE CONTEXT (achievements, volunteering, notes, saved application answers, prior gap Q&A — honest evidence only):
{profileContext}

GITHUB PROJECT CONTEXT (synced repos — use for honest project bullets & skills):
{githubContext}

TARGET JOB ANALYSIS:
{jobAnalysis}

ATS GAPS TO CLOSE (weave in ONLY if profile or Q&A honestly supports them):
{atsGaps}

USER Q&A (new evidence — incorporate truthfully into the closest real role or project):
{enhancements}

REAL GAPS — NEVER fabricate, imply, or keyword-stuff these. Omit or stay silent:
{realGaps}

ADJACENT MATCHES — use ONLY with the honest framing provided (no stronger claims):
{adjacentMatches}

RULES:
1. NEVER fabricate experience, skills, metrics, employers, or tools they did not use.
2. Prefer rewriting existing bullets over adding new ones. Name the JD's tools in bullets where the work was already that work (e.g. they built APIs → say "REST APIs" if the JD says REST). Put concrete tech names in bullets (recruiters skim for them).
3. Q&A is first-class evidence. Rewrite it as a real resume bullet (action + what you did + tools). Put it on the matching role or project — if they named a different employer or project (e.g. IRC, NEMT Billing), add or update THAT entry. Never stuff unrelated work into the job you are tailoring for.
4. Summary: 3–4 tight lines. Role + strongest relevant proof + this job's domain/company signal when true. Keep THEIR voice — sentence length, how they name tools, no "results-driven" or "synergy" unless they already write that way.
5. Skills MUST be categorized (not one comma wall). Prefer:
   **Languages:** …
   **Frameworks & Tools:** …
   **Cloud & Data:** … (or **Tools:** if not cloud-heavy)
   Put honestly-held JD skills first within each line. Deduplicate across lines. Do not add skills they do not have.
6. Drop or demote bullets that do not help this job. Keep the ones that prove they can do the work.
7. Projects: keep ONLY the 2–3 strongest projects that share tools, domain, or outcomes with this JD. Drop unrelated hobby/game/class projects from this tailored snapshot even if they are on the master.
8. Experience: if they founded or shipped a real product (SaaS, app, open source with users) and it is on the profile/GitHub/Q&A, you MAY list it under Experience as Founder / Builder / Lead Developer with honest dates — when that is true. Do not invent titles.
9. Length budget: {lengthBudget}. Strong action verbs. Quantify only when the source has numbers. Prefer density over fluff — a clean one-pager beats a sparse two-pager.
10. Education: one clean degree line. Never repeat the major ("B.S. in Computer Science in Computer Science"). Include GPA/coursework only if it helps and fits the length budget.
11. Full restructure is allowed on this tailored snapshot only (not the master). Section order for early-career one-pagers: Summary → Skills → Experience → Projects → Education → Certifications (omit empty).
12. Mirror diction from the original bullets. Do not homogenize into generic corporate resume-speak.
13. Return HireIQ markdown ONLY — no JSON, no code fences, no commentary before/after.

TARGET ATS: {atsSystem}
SENIORITY: {seniority}

OUTPUT FORMAT (exact section order):
# Full Name
email · phone · location · links

## Summary
...

## Skills
**Languages:** ...
**Frameworks & Tools:** ...
**Cloud & Data:** ...

## Experience
### Title | Company | MM/YYYY – Present <!-- id:exp_1 -->
- bullet
Skills: tool1, tool2

## Projects
### Name <!-- id:proj_1 -->
- bullet
Tech: a, b

## Education
### Degree · Field · School <!-- id:edu_1 -->
YYYY – YYYY

## Certifications
- Name · Issuer · date

## Tailoring notes
- **summary** — change: quote the NEW sentence — reason: one concrete why
- **experience (Acme)** — change: quote the NEW bullet — reason: one concrete why

Tailoring notes are mandatory for every material change. Never write "improved wording" or "tailored for the role". Keep existing <!-- id:... --> values when you keep that role/project; new entries may use new ids.`

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
