/** Labels that must not be invented — only filled from known profile facts. */
const SENSITIVE_PATTERNS: RegExp[] = [
  /\brace\b/i,
  /ethnic/i,
  /\bgender\b/i,
  /\bsex\b/i,
  /veteran/i,
  /military/i,
  /disabilit/i,
  /\blgbt/i,
  /religion/i,
  /convict/i,
  /criminal/i,
  /felony/i,
  /misdemeanor/i,
  /salary/i,
  /compensation/i,
  /\bwage\b/i,
  /pay\s*rate/i,
  /authorized to work/i,
  /work authorization/i,
  /work\s*auth/i,
  /\bvisa\b/i,
  /citizenship/i,
  /sponsorship/i,
  /\bssn\b/i,
  /social security/i,
  /date of birth/i,
  /\bdob\b/i,
  /\bage\b/i,
]

export function isSensitiveFieldLabel(label: string): boolean {
  const text = (label || '').trim()
  if (!text) return false
  return SENSITIVE_PATTERNS.some(re => re.test(text))
}
