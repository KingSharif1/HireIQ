import { describe, expect, it } from 'vitest'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { canonicalSkill, listHasSkill, textMentionsSkill } from '@/lib/scoring/skill-lexicon'
import type { JobExtractedData, StructuredResume } from '@/types'

function resume(over: Partial<StructuredResume> = {}): StructuredResume {
  return {
    contact: { name: 'Sam Dev', email: 's@x.com', phone: '555-111-2222', location: 'Abilene, TX', linkedin: '', github: '', portfolio: '', website: '' },
    summary: 'Full-stack developer who ships web products with TypeScript and Next.js.',
    experience: [
      {
        title: 'Software Engineer', company: 'Acme', location: 'Remote', startDate: '01/2024', endDate: 'Present', current: true,
        bullets: ['Built a Next.js and TypeScript dashboard backed by Supabase and PostgreSQL', 'Integrated Stripe payments and shipped weekly'],
        skills_used: ['TypeScript', 'Next.js', 'Supabase'],
      },
    ],
    education: [{ degree: 'B.S. Computer Science', field: 'Computer Science', institution: 'HSU', startDate: '2021', endDate: '2025', gpa: '' }],
    skills: { technical: ['TypeScript', 'React', 'Node.js'], soft: [], tools: ['Git', 'Docker'], languages: ['JavaScript', 'Python', 'Java'] },
    projects: [{ name: 'Roomba dashboard', description: 'Control app', technologies: ['React', 'Python'], bullets: ['Built a live map view with WebSockets'] }],
    certifications: [],
    ...over,
  } as StructuredResume
}

function job(over: Partial<JobExtractedData> = {}): Partial<JobExtractedData> {
  return {
    title: 'Software Engineer I', company: 'Globex', required_skills: ['TypeScript', 'React'], preferred_skills: [],
    required_experience_years: 0, education_requirement: 'bachelor', keywords: [], responsibilities: [], seniority: 'entry',
    ...over,
  }
}

describe('skill lexicon', () => {
  it('java does not match javascript', () => {
    expect(textMentionsSkill('built apps in javascript and typescript', 'Java')).toBe(false)
    expect(textMentionsSkill('wrote java services', 'Java')).toBe(true)
  })
  it('collapses aliases', () => {
    expect(canonicalSkill('Postgres')).toBe('postgresql')
    expect(canonicalSkill('NodeJS')).toBe('node.js')
    expect(canonicalSkill('k8s')).toBe('kubernetes')
    expect(canonicalSkill('Next')).toBe('next.js')
  })
  it('matches aliases in text and lists', () => {
    expect(textMentionsSkill('tuned postgres queries', 'PostgreSQL')).toBe(true)
    expect(listHasSkill(['Node.js', 'Express'], 'nodejs')).toBe(true)
    expect(listHasSkill(['React, Vue'], 'vue')).toBe(true)
  })
  it('ambiguous words do not match in running text', () => {
    expect(textMentionsSkill('the next step is to go live', 'Next.js')).toBe(false)
    expect(textMentionsSkill('the next step is to go live', 'Go')).toBe(false)
    expect(textMentionsSkill('we use rest of the stack', 'REST')).toBe(false)
    expect(listHasSkill(['Go', 'Rust'], 'Go')).toBe(true)
  })
  it('handles c++, c# and .js names', () => {
    expect(textMentionsSkill('systems work in c++ and c#', 'C++')).toBe(true)
    expect(textMentionsSkill('systems work in c++ and c#', 'C#')).toBe(true)
    expect(textMentionsSkill('systems work in c++', 'C#')).toBe(false)
    expect(textMentionsSkill('used node.js daily', 'Node')).toBe(true)
  })
})

describe('calculateATSScore (fit)', () => {
  it('scores a strong entry-level match high', () => {
    const s = calculateATSScore(resume(), job())
    expect(s.total).toBeGreaterThanOrEqual(85)
    expect(s.must_have_missing).toEqual([])
    expect(s.cap).toBeNull()
  })

  it('a missing required skill caps the total at 60 and names it', () => {
    const s = calculateATSScore(resume(), job({ required_skills: ['TypeScript', 'React', 'Kubernetes', 'Go', 'Rust'] }))
    expect(s.total).toBeLessThanOrEqual(45) // 3 of 5 required missing
    expect(s.must_have_missing).toEqual(expect.arrayContaining(['Kubernetes', 'Rust']))
    expect(s.cap?.limit).toBe(45)

    const one = calculateATSScore(resume(), job({ required_skills: ['TypeScript', 'React', 'Rust'] }))
    expect(one.total).toBeLessThanOrEqual(60)
    expect(one.cap?.limit).toBe(60)
    expect(one.cap?.reason).toMatch(/Rust/)
  })

  it('does not count Java when only JavaScript is on the resume', () => {
    const r = resume({ skills: { technical: ['TypeScript'], soft: [], tools: [], languages: ['JavaScript'] } })
    r.projects = []
    r.experience[0].bullets = ['Built apps in JavaScript']
    r.experience[0].skills_used = []
    const s = calculateATSScore(r, job({ required_skills: ['Java'] }))
    expect(s.must_have_missing).toEqual(['Java'])
  })

  it('matches aliases (Postgres vs PostgreSQL)', () => {
    const s = calculateATSScore(resume(), job({ required_skills: ['Postgres'] }))
    expect(s.must_have_missing).toEqual([])
    expect(s.evidence?.Postgres).toBe('work')
  })

  it('weights evidence: work > project > listed, and flags listed-only', () => {
    const base = job({ required_skills: ['Next.js'] })
    const work = calculateATSScore(resume(), base)
    expect(work.evidence?.['Next.js']).toBe('work')

    const proj = resume()
    proj.experience[0].bullets = ['Maintained internal tools']
    proj.experience[0].skills_used = []
    proj.summary = 'Developer.'
    proj.projects = [{ name: 'Site', description: 'Built with Next.js', technologies: ['Next.js'], bullets: [] }] as never
    expect(calculateATSScore(proj, base).evidence?.['Next.js']).toBe('project')

    const listed = resume({ skills: { technical: ['Next.js'], soft: [], tools: [], languages: [] } })
    listed.experience[0].bullets = ['Maintained internal tools']
    listed.experience[0].skills_used = []
    listed.projects = []
    const ls = calculateATSScore(listed, base)
    expect(ls.evidence?.['Next.js']).toBe('listed')
    expect(ls.listed_only).toEqual(['Next.js'])
    expect(ls.total).toBeLessThanOrEqual(85)
    expect(ls.total).toBeLessThan(calculateATSScore(resume(), base).total + 1)
  })

  it('keyword stuffing in the skills list cannot beat real evidence', () => {
    const stuffed = resume({ skills: { technical: ['Kubernetes', 'Terraform', 'AWS', 'Go', 'Rust'], soft: [], tools: [], languages: [] } })
    const j = job({ required_skills: ['Kubernetes', 'Terraform', 'AWS', 'Go', 'Rust'] })
    const s = calculateATSScore(stuffed, j)
    expect(s.total).toBeLessThanOrEqual(85)
    expect(s.listed_only?.length).toBe(5)
  })

  it('a senior role scores far below an entry-level one for the same candidate', () => {
    const entry = calculateATSScore(resume(), job())
    const senior = calculateATSScore(resume(), job({ title: 'Senior Software Engineer', seniority: 'senior', required_experience_years: 6 }))
    expect(entry.total - senior.total).toBeGreaterThanOrEqual(30)
    expect(senior.breakdown.level).toBeLessThan(60)
    expect(senior.total).toBeLessThanOrEqual(55)
    expect(senior.cap?.reason).toMatch(/Senior|years/)
  })

  it('merges overlapping roles instead of double counting years', () => {
    const r = resume()
    r.experience = [
      { ...r.experience[0], startDate: '01/2022', endDate: '12/2023', current: false },
      { ...r.experience[0], startDate: '06/2022', endDate: '12/2023', current: false },
    ]
    r.projects = []
    const s = calculateATSScore(r, job({ required_experience_years: 4 }))
    // ~2 real years against 4 required = about 50, not ~85 as double counting would give
    expect(s.breakdown.experience).toBeGreaterThanOrEqual(40)
    expect(s.breakdown.experience).toBeLessThanOrEqual(60)
  })

  it('formatting never changes the fit total', () => {
    const tidy = calculateATSScore(resume(), job())
    const messy = resume()
    messy.summary = ''
    messy.contact.phone = ''
    messy.experience[0].bullets = ['i did things for my team', 'we shipped stuff with Next.js TypeScript Supabase PostgreSQL']
    const s = calculateATSScore(messy, job())
    expect(s.breakdown.format).toBeLessThan(tidy.breakdown.format)
    expect(s.total).toBe(tidy.total)
  })

  it('sentence-like keywords are ignored; short ones count', () => {
    const s = calculateATSScore(
      resume(),
      job({ keywords: ['dashboard', 'Collaborate with cross-functional partners to deliver value to customers at scale'], required_skills: [] }),
    )
    expect(s.matched_keywords).toContain('dashboard')
    expect(s.missing_keywords).toEqual([])
  })

  it('a post with almost no detail is capped and marked low confidence', () => {
    const s = calculateATSScore(resume(), { title: 'Engineer', company: 'Acme' })
    expect(s.confidence).toBe('low')
    expect(s.total).toBeLessThanOrEqual(75)
  })

  it('takes the best degree, not the first listed', () => {
    const r = resume()
    r.education = [
      { degree: 'Certificate in Web Development', field: '', institution: 'Bootcamp', startDate: '2020', endDate: '2021', gpa: '' },
      { degree: 'M.S. Computer Science', field: '', institution: 'U', startDate: '2022', endDate: '2024', gpa: '' },
    ] as never
    expect(calculateATSScore(r, job({ education_requirement: 'master' })).breakdown.education).toBe(100)
  })

  it('stays finite and in range on empty input', () => {
    const empty = { contact: {}, summary: '', experience: [], education: [], skills: { technical: [], soft: [], tools: [], languages: [] }, projects: [], certifications: [] } as unknown as StructuredResume
    const s = calculateATSScore(empty, {})
    expect(Number.isFinite(s.total)).toBe(true)
    expect(s.total).toBeGreaterThanOrEqual(0)
    expect(s.total).toBeLessThanOrEqual(100)
  })
})
