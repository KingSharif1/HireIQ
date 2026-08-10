/** Job-specific prompts — answers should not promote to master profile. */
const JOB_SPECIFIC_PATTERNS: RegExp[] = [
  /why (this|are you|do you)/i,
  /cover letter/i,
  /motivation/i,
  /interest in (this|the|our)/i,
  /this (company|role|position|job|opportunity)/i,
  /availability/i,
  /start date/i,
  /notice period/i,
  /when can you (start|begin)/i,
  /relocat/i,
]

/** Career facts that can promote to master as pendingSuggestions. */
const LASTING_PATTERNS: RegExp[] = [
  /\bskills?\b/i,
  /years?.{0,20}experience/i,
  /\btools?\b/i,
  /\blanguages?\b/i,
  /education/i,
  /\bdegree\b/i,
  /university|college|school/i,
  /certif/i,
  /authorized to work/i,
  /work authori/i,
  /\bvisa\b/i,
  /citizenship/i,
  /sponsorship/i,
]

/**
 * True for lasting career facts (skills, YOE, tools, languages, education,
 * work-auth labels). False for company/role essays and job-specific availability.
 */
export function isLastingCareerFact(label: string): boolean {
  const text = (label || '').trim()
  if (!text) return false
  if (JOB_SPECIFIC_PATTERNS.some(re => re.test(text))) return false
  return LASTING_PATTERNS.some(re => re.test(text))
}
