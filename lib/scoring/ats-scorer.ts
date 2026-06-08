import type { StructuredResume, JobExtractedData, ATSScore } from '@/types'
import { normalizeSkill } from './keyword-extractor'

const ACTION_VERBS = [
  'built','developed','designed','implemented','led','managed','created','improved',
  'increased','reduced','delivered','launched','architected','optimized','automated',
  'scaled','migrated','integrated','deployed','collaborated','mentored','drove',
  'established','streamlined','maintained','refactored','engineered','shipped',
  'analyzed','coordinated','executed','facilitated','generated','handled','identified',
]

function resumeFullText(resume: StructuredResume): string {
  const parts: string[] = [
    resume.summary || '',
    ...resume.experience.flatMap(e => [e.title, e.company, ...e.bullets, ...e.skills_used]),
    ...resume.education.map(e => `${e.degree} ${e.field} ${e.institution}`),
    ...(resume.skills?.technical || []),
    ...(resume.skills?.tools || []),
    ...(resume.skills?.languages || []),
    ...resume.projects.flatMap(p => [p.name, p.description, ...p.bullets, ...p.technologies]),
  ]
  return parts.join(' ').toLowerCase()
}

function calculateKeywordScore(resume: StructuredResume, job: JobExtractedData) {
  const resumeText = resumeFullText(resume)
  const matched: string[] = []
  const missing: string[] = []

  const allKeywords = [...new Set([...job.keywords, ...job.required_skills, ...job.responsibilities.slice(0, 5)])]

  for (const kw of allKeywords) {
    const normalized = kw.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    if (resumeText.includes(normalized) || resumeText.includes(normalizeSkill(kw))) {
      matched.push(kw)
    } else {
      missing.push(kw)
    }
  }

  const score = allKeywords.length > 0 ? Math.round((matched.length / allKeywords.length) * 100) : 100
  return { score, matched, missing }
}

function calculateSkillScore(resume: StructuredResume, job: JobExtractedData) {
  const resumeSkills = [
    ...(resume.skills?.technical || []),
    ...(resume.skills?.tools || []),
    ...(resume.skills?.languages || []),
    ...resume.experience.flatMap(e => e.skills_used),
    ...resume.projects.flatMap(p => p.technologies),
  ].map(normalizeSkill)

  const matched: string[] = []
  const missing: string[] = []
  let earnedPoints = 0
  let totalPoints = 0

  for (const skill of job.required_skills) {
    totalPoints += 2
    if (resumeSkills.includes(normalizeSkill(skill))) {
      earnedPoints += 2
      matched.push(skill)
    } else {
      missing.push(skill)
    }
  }

  for (const skill of job.preferred_skills) {
    totalPoints += 1
    if (resumeSkills.includes(normalizeSkill(skill))) {
      earnedPoints += 1
      matched.push(skill)
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100
  return { score, matched: [...new Set(matched)], missing: [...new Set(missing)] }
}

function calculateExperienceScore(resume: StructuredResume, job: JobExtractedData): { score: number } {
  if (!job.required_experience_years || job.required_experience_years === 0) return { score: 100 }

  let totalMonths = 0
  const now = new Date()

  for (const exp of resume.experience) {
    try {
      const [startM, startY] = exp.startDate.split('/').map(Number)
      let endDate: Date

      if (exp.current || exp.endDate === 'Present') {
        endDate = now
      } else {
        const [endM, endY] = exp.endDate.split('/').map(Number)
        endDate = new Date(endY, endM - 1)
      }

      const startDate = new Date(startY, startM - 1)
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                     (endDate.getMonth() - startDate.getMonth())
      totalMonths += Math.max(0, months)
    } catch {
      // Skip unparseable dates
    }
  }

  const resumeYears = totalMonths / 12
  const score = Math.min(100, Math.round((resumeYears / job.required_experience_years) * 100))
  return { score }
}

function calculateFormatScore(resume: StructuredResume): { score: number } {
  let score = 0

  if (resume.contact?.email) score += 10
  if (resume.contact?.phone) score += 10
  if (resume.summary && resume.summary.length > 20) score += 15
  if (resume.experience?.length > 0) score += 10
  if (resume.experience?.some(e => e.bullets?.length >= 2)) score += 15

  const allBullets = resume.experience.flatMap(e => e.bullets)
  const bulletsWithVerbs = allBullets.filter(b => {
    const first = b.toLowerCase().split(' ')[0]
    return ACTION_VERBS.some(v => first.startsWith(v))
  })
  if (allBullets.length > 0 && bulletsWithVerbs.length / allBullets.length >= 0.5) score += 15

  const hasPronouns = allBullets.some(b => /\b(i |my |we |our )/i.test(b))
  if (!hasPronouns) score += 10

  if ((resume.skills?.technical?.length || 0) + (resume.skills?.tools?.length || 0) > 3) score += 10
  if (resume.education?.length > 0) score += 5

  return { score: Math.min(100, score) }
}

function calculateEducationScore(resume: StructuredResume, job: JobExtractedData): { score: number } {
  const tierMap: Record<string, number> = { none: 0, associate: 1, bachelor: 2, master: 3, phd: 4 }
  const required = tierMap[job.education_requirement?.toLowerCase() || 'none'] ?? 0
  if (required === 0) return { score: 100 }

  const topDegree = resume.education?.[0]?.degree?.toLowerCase() || ''
  let resumeTier = 0
  if (topDegree.includes('phd') || topDegree.includes('doctor')) resumeTier = 4
  else if (topDegree.includes('master') || topDegree.includes('m.s') || topDegree.includes('mba')) resumeTier = 3
  else if (topDegree.includes('bachelor') || topDegree.includes('b.s') || topDegree.includes('b.a')) resumeTier = 2
  else if (topDegree.includes('associate')) resumeTier = 1

  return { score: resumeTier >= required ? 100 : Math.round((resumeTier / required) * 60) }
}

function generateRecommendations(
  total: number,
  breakdown: { keywords: number; skills: number; format: number },
  missingKeywords: string[],
  missingSkills: string[]
): string[] {
  const recs: string[] = []

  if (breakdown.keywords < 60 && missingKeywords.length > 0) {
    recs.push(`Add these keywords from the job description: ${missingKeywords.slice(0, 5).join(', ')}`)
  }
  if (breakdown.skills < 60 && missingSkills.length > 0) {
    recs.push(`Highlight these required skills: ${missingSkills.slice(0, 4).join(', ')}`)
  }
  if (breakdown.format < 70) {
    recs.push('Start more bullet points with strong action verbs (Built, Led, Designed, etc.)')
  }
  if (total < 50) {
    recs.push('Consider answering the gap questions to surface more relevant experience')
  }

  return recs
}

export function calculateATSScore(resume: StructuredResume, job: JobExtractedData): ATSScore {
  const keywordResult = calculateKeywordScore(resume, job)
  const skillResult = calculateSkillScore(resume, job)
  const expResult = calculateExperienceScore(resume, job)
  const formatResult = calculateFormatScore(resume)
  const eduResult = calculateEducationScore(resume, job)

  const total = Math.round(
    keywordResult.score * 0.35 +
    skillResult.score * 0.25 +
    expResult.score * 0.20 +
    formatResult.score * 0.15 +
    eduResult.score * 0.05
  )

  return {
    total,
    breakdown: {
      keywords: keywordResult.score,
      skills: skillResult.score,
      experience: expResult.score,
      format: formatResult.score,
      education: eduResult.score,
    },
    matched_keywords: keywordResult.matched,
    missing_keywords: keywordResult.missing,
    matched_skills: skillResult.matched,
    missing_skills: skillResult.missing,
    recommendations: generateRecommendations(
      total,
      { keywords: keywordResult.score, skills: skillResult.score, format: formatResult.score },
      keywordResult.missing,
      skillResult.missing
    ),
  }
}
