import type { ResumeDiffChange, ResumeExperience, ResumeProject } from '@/types'
import type { WriteBackSuggestion } from '@/lib/ai/tailor-types'

const STOP = new Set([
  'the',
  'and',
  'for',
  'inc',
  'llc',
  'corp',
  'ltd',
  'with',
  'from',
  'that',
  'this',
  'have',
  'been',
  'were',
  'was',
  'did',
])

export function normalizeMatchKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function nameMentioned(haystack: string, name: string): boolean {
  const key = normalizeMatchKey(name)
  if (key.length < 3) return false
  if (normalizeMatchKey(haystack).includes(key)) return true
  const tokens = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOP.has(t))
  if (tokens.length === 0) return false
  const hay = haystack.toLowerCase()
  return tokens.every(t => hay.includes(t))
}

/** Pull an employer/org the user named that is not already a profile company. */
export function extractLikelyEmployer(answer: string): string | null {
  const patterns = [
    /(?:worked|work|intern(?:ed|ship)?|volunteer(?:ed)?)\s+(?:at|for)\s+(?:the\s+)?([^.,;\n]+)/i,
    /(?:while|when)\s+(?:at|with)\s+(?:the\s+)?([^.,;\n]+)/i,
  ]
  for (const pattern of patterns) {
    const match = answer.match(pattern)
    const raw = match?.[1]?.trim()
    if (!raw) continue
    const cleaned = raw
      .replace(/\s+(doing|as|where|and)\b[\s\S]*$/i, '')
      .replace(/^(the)\s+/i, '')
      .trim()
    if (cleaned.length < 2 || cleaned.length > 60) continue
    return cleaned.replace(/\s+/g, ' ')
  }
  return null
}

export function polishResumeBullet(raw: string): string {
  let text = raw.trim().replace(/^[-•*]+\s*/, '')
  text = text.replace(/^(yeah|yes|yep|sure|ok|okay|um+|uh|so|like|basically)\s*[,.\-:]?\s*/i, '')
  text = text.replace(/^i\s+/i, '')
  text = text.replace(/\s+/g, ' ').trim()
  if (!text) return raw.trim()
  const capped = text.charAt(0).toUpperCase() + text.slice(1)
  if (!/[.!?]$/.test(capped) && capped.length > 80) return `${capped}.`
  return capped
}

export type AddedLine = {
  text: string
  section: 'experience' | 'projects'
  expId?: string
  projId?: string
}

export function addedBulletsFromChanges(changes: ResumeDiffChange[]): AddedLine[] {
  const out: AddedLine[] = []
  for (const change of changes) {
    if (change.field !== 'bullets') continue
    if (change.section !== 'experience' && change.section !== 'projects') continue
    const before = Array.isArray(change.before) ? change.before : []
    const after = Array.isArray(change.after) ? change.after : typeof change.after === 'string' ? [change.after] : []
    for (const line of after) {
      if (typeof line !== 'string' || !line.trim()) continue
      if (before.includes(line)) continue
      out.push({
        text: line.trim(),
        section: change.section,
        expId: change.expId,
        projId: change.projId,
      })
    }
  }
  return out
}

function tokenOverlap(answer: string, line: string): number {
  const tokens = answer
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 3 && !STOP.has(t))
  if (tokens.length === 0) return 0
  const hay = line.toLowerCase()
  return tokens.filter(t => hay.includes(t)).length
}

export function pickRewrittenLine(answer: string, added: AddedLine[]): AddedLine | null {
  let best: AddedLine | null = null
  let bestScore = 0
  for (const line of added) {
    const score = tokenOverlap(answer, line.text)
    if (score > bestScore) {
      best = line
      bestScore = score
    }
  }
  if (!best) return null
  if (bestScore >= 2) return best
  if (bestScore >= 1 && best.text.length >= 40) return best
  return null
}

export type RouteProfile = {
  experience: Pick<ResumeExperience, 'id' | 'company' | 'title'>[]
  projects: Pick<ResumeProject, 'id' | 'name'>[]
}

export function routeGapAnswer(input: {
  questionId: string
  question?: string
  answer: string
  jobTitle: string
  profile: RouteProfile
  addedLines?: AddedLine[]
}): WriteBackSuggestion & { newExperience?: { company: string; title?: string } } {
  const answer = input.answer.trim()
  const haystack = `${input.question ?? ''} ${answer}`
  const added = input.addedLines ?? []

  const matchedProject = input.profile.projects.find(p => nameMentioned(haystack, p.name))
  const matchedRole = input.profile.experience.find(
    e => nameMentioned(haystack, e.company) || nameMentioned(haystack, e.title)
  )
  const extracted = extractLikelyEmployer(answer)
  const extractedIsNew =
    Boolean(extracted) &&
    !input.profile.experience.some(e => nameMentioned(extracted!, e.company) || nameMentioned(e.company, extracted!))

  let rewritten = pickRewrittenLine(answer, added)
  if (rewritten && matchedProject && !nameMentioned(rewritten.text, matchedProject.name)) {
    rewritten = null
  }
  if (rewritten && extractedIsNew && extracted) {
    const mentionsOldJob = input.profile.experience.some(e => nameMentioned(rewritten!.text, e.company))
    const mentionsNew = nameMentioned(rewritten.text, extracted)
    if (mentionsOldJob && !mentionsNew) rewritten = null
  }

  const proposedText = rewritten?.text ?? polishResumeBullet(answer)
  const reasonBase = `Resume line from your answer — not the chat wording.`

  if (matchedProject) {
    return {
      id: `wb-${input.questionId}`,
      section: 'projects',
      targetEntryId: matchedProject.id,
      proposedText,
      reason: `${reasonBase} Goes on ${matchedProject.name}.`,
      sourceQuestionId: input.questionId,
    }
  }

  if (matchedRole && !extractedIsNew) {
    return {
      id: `wb-${input.questionId}`,
      section: 'experience',
      targetEntryId: matchedRole.id,
      proposedText,
      reason: `${reasonBase} Goes on ${matchedRole.title || 'role'} @ ${matchedRole.company}.`,
      sourceQuestionId: input.questionId,
    }
  }

  if (extractedIsNew && extracted) {
    return {
      id: `wb-${input.questionId}`,
      section: 'experience',
      proposedText,
      reason: `${reasonBase} Sounds like a new role at ${extracted} — confirm before adding.`,
      sourceQuestionId: input.questionId,
      newExperience: { company: extracted },
    }
  }

  return {
    id: `wb-${input.questionId}`,
    section: 'experience',
    proposedText,
    reason: `${reasonBase} Confirm which role this belongs on — it won’t be dropped on the first job.`,
    sourceQuestionId: input.questionId,
  }
}

export function buildRoutedWriteBacks(input: {
  answers: Record<string, string>
  questionLabels?: Record<string, string>
  jobTitle: string
  profile: RouteProfile
  changes?: ResumeDiffChange[]
}): Array<WriteBackSuggestion & { newExperience?: { company: string; title?: string } }> {
  const addedLines = addedBulletsFromChanges(input.changes ?? [])
  return Object.entries(input.answers)
    .filter(([, answer]) => answer.trim().length > 20)
    .map(([questionId, answer]) =>
      routeGapAnswer({
        questionId,
        question: input.questionLabels?.[questionId],
        answer,
        jobTitle: input.jobTitle,
        profile: input.profile,
        addedLines,
      })
    )
}
