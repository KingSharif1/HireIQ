import type { StructuredResume, JobExtractedData, ATSScore, SkillEvidence } from '@/types'
import { canonicalSkill, listHasSkill, textMentionsSkill } from './skill-lexicon'
import { normalizeJobExtractedData } from '@/lib/jobs/normalize-job'
import { resolveSeniority } from '@/lib/jobs/seniority'

/**
 * Job-fit score. What it rewards, in order of weight:
 *   skills (evidence-weighted) > keywords > level fit > experience > education.
 * Resume formatting is reported but never counts toward fit.
 * A required skill with no evidence caps the total, so keyword stuffing and
 * partial matches cannot reach a high score.
 */

const WEIGHTS = { skills: 0.45, keywords: 0.2, level: 0.15, experience: 0.15, education: 0.05 }
const EVIDENCE_CREDIT: Record<SkillEvidence, number> = { work: 1, project: 0.85, listed: 0.6 }

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseResumeDate(dateStr: string, endOfMonth = false): Date | null {
  if (!dateStr || dateStr === 'Present') return null
  const trimmed = dateStr.trim()
  const slash = trimmed.split('/')
  if (slash.length === 2) {
    const [m, y] = slash.map(Number)
    if (Number.isFinite(m) && Number.isFinite(y)) return new Date(y, m - 1, endOfMonth ? 28 : 1)
  }
  if (/^\d{4}$/.test(trimmed)) return new Date(Number(trimmed), endOfMonth ? 11 : 0, endOfMonth ? 31 : 1)
  const parsed = new Date(trimmed)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

const ACTION_VERBS = [
  'built', 'developed', 'designed', 'implemented', 'led', 'managed', 'created', 'improved',
  'increased', 'reduced', 'delivered', 'launched', 'architected', 'optimized', 'automated',
  'scaled', 'migrated', 'integrated', 'deployed', 'collaborated', 'mentored', 'drove',
  'established', 'streamlined', 'maintained', 'refactored', 'engineered', 'shipped',
  'analyzed', 'coordinated', 'executed', 'facilitated', 'generated', 'handled', 'identified',
]

// ---------- evidence ----------

type Evidence = { work: string; project: string; workLists: string[]; projectLists: string[]; skillLists: string[] }

function collectEvidence(resume: StructuredResume): Evidence {
  const exp = resume.experience ?? []
  const proj = resume.projects ?? []
  return {
    work: exp.flatMap(e => [e.title, ...(e.bullets ?? [])]).join(' \n ').toLowerCase(),
    project: proj.flatMap(p => [p.name, p.description, ...(p.bullets ?? [])]).filter(Boolean).join(' \n ').toLowerCase(),
    workLists: exp.flatMap(e => e.skills_used ?? []),
    projectLists: proj.flatMap(p => p.technologies ?? []),
    skillLists: [
      ...(resume.skills?.technical ?? []),
      ...(resume.skills?.tools ?? []),
      ...(resume.skills?.languages ?? []),
    ],
  }
}

function evidenceFor(ev: Evidence, skill: string): SkillEvidence | null {
  if (textMentionsSkill(ev.work, skill) || listHasSkill(ev.workLists, skill)) return 'work'
  if (textMentionsSkill(ev.project, skill) || listHasSkill(ev.projectLists, skill)) return 'project'
  if (listHasSkill(ev.skillLists, skill)) return 'listed'
  return null
}

// ---------- components ----------

function skillComponent(ev: Evidence, job: JobExtractedData) {
  const required = [...new Set((job.required_skills ?? []).map(s => s.trim()).filter(Boolean))]
  const preferred = [...new Set((job.preferred_skills ?? []).map(s => s.trim()).filter(Boolean))].filter(
    s => !required.some(r => canonicalSkill(r) === canonicalSkill(s)),
  )

  const evidence: Record<string, SkillEvidence> = {}
  const matched: string[] = []
  const missing: string[] = []
  const mustHaveMissing: string[] = []
  const listedOnly: string[] = []
  let earned = 0
  let total = 0

  for (const [skills, weight, isRequired] of [[required, 2, true], [preferred, 0.5, false]] as const) {
    for (const skill of skills) {
      total += weight
      const e = evidenceFor(ev, skill)
      if (e) {
        earned += weight * EVIDENCE_CREDIT[e]
        evidence[skill] = e
        matched.push(skill)
        if (e === 'listed') listedOnly.push(skill)
      } else if (isRequired) {
        missing.push(skill)
        mustHaveMissing.push(skill)
      }
    }
  }

  return {
    hasData: total > 0,
    score: total > 0 ? clampScore((earned / total) * 100) : 0,
    matched,
    missing,
    mustHaveMissing,
    listedOnly,
    evidence,
    requiredCount: required.length,
  }
}

function keywordComponent(resume: StructuredResume, job: JobExtractedData) {
  const skillKeys = new Set([...(job.required_skills ?? []), ...(job.preferred_skills ?? [])].map(canonicalSkill))
  const text = [
    resume.summary,
    ...(resume.experience ?? []).flatMap(e => [e.title, ...(e.bullets ?? [])]),
    ...(resume.projects ?? []).flatMap(p => [p.name, p.description, ...(p.bullets ?? [])]),
    ...(resume.skills?.technical ?? []),
    ...(resume.skills?.tools ?? []),
    ...(resume.skills?.languages ?? []),
  ]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase()

  // Short terms only: sentences are not keywords, and skills are scored once, in the skills component.
  const keywords = [...new Set((job.keywords ?? []).map(k => k.trim()).filter(k => k && k.split(/\s+/).length <= 3))].filter(
    k => !skillKeys.has(canonicalSkill(k)),
  )
  const matched: string[] = []
  const missing: string[] = []
  for (const kw of keywords) {
    const hit = textMentionsSkill(text, kw) || new RegExp(`(^|[^a-z0-9])${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`).test(text)
    ;(hit ? matched : missing).push(kw)
  }
  return {
    hasData: keywords.length > 0,
    score: keywords.length > 0 ? clampScore((matched.length / keywords.length) * 100) : 0,
    matched,
    missing,
  }
}

/** Years of paid work, with overlapping roles merged so they are not double counted. */
function workYears(resume: StructuredResume): number {
  const now = new Date()
  const spans: Array<[number, number]> = []
  for (const exp of resume.experience ?? []) {
    const start = parseResumeDate(exp.startDate)
    if (!start) continue
    const end = exp.current || exp.endDate === 'Present' || !exp.endDate ? now : (parseResumeDate(exp.endDate, true) ?? now)
    if (end.getTime() > start.getTime()) spans.push([start.getTime(), end.getTime()])
  }
  spans.sort((a, b) => a[0] - b[0])
  let ms = 0
  let cur: [number, number] | null = null
  for (const s of spans) {
    if (!cur) cur = [...s]
    else if (s[0] <= cur[1]) cur[1] = Math.max(cur[1], s[1])
    else {
      ms += cur[1] - cur[0]
      cur = [...s]
    }
  }
  if (cur) ms += cur[1] - cur[0]
  return ms / (1000 * 60 * 60 * 24 * 365.25)
}

/** Work years plus a small credit for substantial projects (up to one year). */
function effectiveYears(resume: StructuredResume): number {
  return workYears(resume) + Math.min(1, (resume.projects?.length ?? 0) * 0.25)
}

function experienceComponent(resume: StructuredResume, job: JobExtractedData) {
  const required = job.required_experience_years ?? 0
  if (!required || required <= 0) return { score: 100, years: effectiveYears(resume) }
  const years = effectiveYears(resume)
  return { score: clampScore(Math.min(1, years / required) * 100), years }
}

type LevelClass = 'early' | 'mid' | 'senior'

function jobLevel(job: JobExtractedData): LevelClass {
  const resolved = resolveSeniority({ seniority: job.seniority, title: job.title, summary: job.summary })
  if (['intern', 'new_grad', 'junior', 'entry', 'entry_level'].includes(resolved)) return 'early'
  const title = (job.title ?? '').toLowerCase()
  if (/\b(senior|sr\.?|staff|principal|lead|manager|director|head of|architect|vp)\b/.test(title)) return 'senior'
  if (['senior', 'staff', 'principal', 'lead', 'manager', 'director', 'executive'].includes(resolved)) return 'senior'
  if (/\b(junior|jr\.?|associate|entry|new grad|graduate|intern)\b|\b(engineer|developer)\s+(i|1)\b/.test(title)) return 'early'
  return resolved === 'mid' || resolved === 'mid_level' ? 'mid' : 'mid'
}

function levelComponent(years: number, job: JobExtractedData) {
  const level = jobLevel(job)
  let score: number
  if (level === 'early') score = 100
  else if (level === 'mid') score = years >= 2 ? 100 : years >= 1 ? 80 : 60
  else score = years >= 5 ? 100 : years >= 3 ? 55 : years >= 1.5 ? 30 : 15
  return { score, level }
}

function formatComponent(resume: StructuredResume): number {
  let score = 0
  if (resume.contact?.email) score += 10
  if (resume.contact?.phone) score += 10
  if (resume.summary && resume.summary.length > 20) score += 15
  if (resume.experience?.length > 0) score += 10
  if (resume.experience?.some(e => e.bullets?.length >= 2)) score += 15
  const allBullets = (resume.experience ?? []).flatMap(e => e.bullets ?? [])
  const withVerbs = allBullets.filter(b => ACTION_VERBS.some(v => b.toLowerCase().split(' ')[0].startsWith(v)))
  if (allBullets.length > 0 && withVerbs.length / allBullets.length >= 0.5) score += 15
  if (!allBullets.some(b => /\b(i |my |we |our )/i.test(b))) score += 10
  if ((resume.skills?.technical?.length || 0) + (resume.skills?.tools?.length || 0) > 3) score += 10
  if (resume.education?.length > 0) score += 5
  return clampScore(score)
}

const DEGREE_TIERS: Array<[RegExp, number]> = [
  [/phd|doctor/, 4],
  [/master|m\.s|\bms\b|mba|m\.eng/, 3],
  [/bachelor|b\.s|\bbs\b|b\.a|\bba\b|b\.eng/, 2],
  [/associate/, 1],
]

function educationComponent(resume: StructuredResume, job: JobExtractedData) {
  const tierMap: Record<string, number> = { none: 0, associate: 1, bachelor: 2, master: 3, phd: 4 }
  const required = tierMap[job.education_requirement?.toLowerCase() || 'none'] ?? 0
  if (required === 0) return 100
  const best = Math.max(
    0,
    ...(resume.education ?? []).map(e => {
      const d = (e.degree || '').toLowerCase()
      return DEGREE_TIERS.find(([re]) => re.test(d))?.[1] ?? 0
    }),
  )
  return clampScore(best >= required ? 100 : Math.round((best / required) * 60))
}

// ---------- total ----------

function applyCap(
  total: number,
  skills: ReturnType<typeof skillComponent>,
  lacksJobData: boolean,
  fit: { level: LevelClass; years: number; requiredYears: number },
): { total: number; cap: ATSScore['cap'] } {
  const caps: Array<{ limit: number; reason: string }> = []
  if (fit.level === 'senior' && fit.years < 5) {
    const limit = fit.years < 1.5 ? 40 : fit.years < 3 ? 50 : 65
    caps.push({ limit, reason: 'Senior role, and the experience asked for is above yours' })
  }
  if (fit.requiredYears >= 3 && fit.years < fit.requiredYears * 0.6) {
    caps.push({ limit: 55, reason: `Asks for ${fit.requiredYears}+ years and you have about ${Math.round(fit.years * 10) / 10}` })
  }
  const req = skills.requiredCount
  if (skills.mustHaveMissing.length > 0) {
    const share = req > 0 ? skills.mustHaveMissing.length / req : 0
    caps.push(
      share >= 0.5
        ? { limit: 45, reason: `Missing most required skills: ${skills.mustHaveMissing.slice(0, 3).join(', ')}` }
        : { limit: 60, reason: `Missing a required skill: ${skills.mustHaveMissing.slice(0, 3).join(', ')}` },
    )
  } else if (skills.listedOnly.length > 0 && skills.requiredCount > 0) {
    caps.push({ limit: 85, reason: `Listed but not shown in any role or project: ${skills.listedOnly.slice(0, 3).join(', ')}` })
  }
  if (lacksJobData) caps.push({ limit: 75, reason: 'The job post gives little to match against' })

  if (caps.length === 0) return { total, cap: null }
  const tightest = caps.reduce((a, b) => (b.limit < a.limit ? b : a))
  return total > tightest.limit ? { total: tightest.limit, cap: tightest } : { total, cap: null }
}

function recommendations(
  total: number,
  skills: ReturnType<typeof skillComponent>,
  keywords: ReturnType<typeof keywordComponent>,
  level: { level: LevelClass },
  format: number,
): string[] {
  const recs: string[] = []
  if (skills.mustHaveMissing.length > 0) {
    recs.push(`Required but not on your resume: ${skills.mustHaveMissing.slice(0, 4).join(', ')}. Add only what you have really done.`)
  }
  if (skills.listedOnly.length > 0) {
    recs.push(`Show where you used ${skills.listedOnly.slice(0, 3).join(', ')} in a role or project bullet, not just the skills list.`)
  }
  if (keywords.missing.length > 0 && keywords.score < 60) {
    recs.push(`Terms from the post worth working in if true: ${keywords.missing.slice(0, 5).join(', ')}`)
  }
  if (level.level === 'senior' && total < 60) recs.push('This is a senior role and the experience asked for is well above yours. Entry-level roles are a better use of your time.')
  if (format < 70) recs.push('Start more bullets with a strong action verb (Built, Led, Designed).')
  if (total < 50) recs.push('Answer the gap questions to surface more relevant experience.')
  return recs
}

export function calculateATSScore(
  resume: StructuredResume,
  jobInput: JobExtractedData | Partial<JobExtractedData>,
): ATSScore {
  const job = normalizeJobExtractedData(jobInput)
  const ev = collectEvidence(resume)
  const skills = skillComponent(ev, job)
  const keywords = keywordComponent(resume, job)
  const exp = experienceComponent(resume, job)
  const level = levelComponent(exp.years, job)
  const education = educationComponent(resume, job)
  const format = formatComponent(resume)

  // Components with no job data behind them drop out and the rest share their weight.
  const parts: Array<[number, number]> = [
    [WEIGHTS.level, level.score],
    [WEIGHTS.experience, exp.score],
    [WEIGHTS.education, education],
  ]
  if (skills.hasData) parts.push([WEIGHTS.skills, skills.score])
  if (keywords.hasData) parts.push([WEIGHTS.keywords, keywords.score])
  const weightSum = parts.reduce((s, [w]) => s + w, 0)
  const raw = clampScore(parts.reduce((s, [w, v]) => s + w * v, 0) / weightSum)

  const lacksJobData = !skills.hasData && !keywords.hasData
  const { total, cap } = applyCap(raw, skills, lacksJobData, {
    level: level.level,
    years: exp.years,
    requiredYears: job.required_experience_years ?? 0,
  })
  const confidence: ATSScore['confidence'] = lacksJobData ? 'low' : skills.hasData && keywords.hasData ? 'high' : 'medium'

  return {
    total,
    breakdown: {
      keywords: keywords.hasData ? keywords.score : skills.score,
      skills: skills.score,
      experience: exp.score,
      format,
      education,
      level: level.score,
    },
    matched_keywords: keywords.matched,
    missing_keywords: keywords.missing,
    matched_skills: skills.matched,
    missing_skills: skills.missing,
    recommendations: recommendations(total, skills, keywords, level, format),
    must_have_missing: skills.mustHaveMissing,
    listed_only: skills.listedOnly,
    evidence: skills.evidence,
    cap,
    confidence,
  }
}
