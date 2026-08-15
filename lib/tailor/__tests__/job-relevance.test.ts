import { describe, expect, it } from 'vitest'
import {
  buildJobOptimizedInclusion,
  scoreProjectForJob,
  selectRelevantProjectIds,
} from '@/lib/tailor/job-relevance'
import { emptyProfileData } from '@/lib/profile/data'
import type { JobExtractedData, ResumeProject } from '@/types'

const job: JobExtractedData = {
  title: 'Software Engineer',
  company: 'Apple',
  required_skills: ['TypeScript', 'React', 'Node.js'],
  preferred_skills: ['AWS'],
  required_experience_years: 2,
  education_requirement: 'BS',
  keywords: ['REST API', 'microservices'],
  responsibilities: ['Build scalable APIs'],
  ats_system: 'generic',
  red_flags: [],
  company_values: [],
  compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
  work_type: 'hybrid',
  seniority: 'junior',
  summary: 'IS&T early career software engineer',
}

const apiProject: ResumeProject = {
  id: 'p1',
  name: 'API Gateway',
  description: 'Node.js REST APIs',
  bullets: ['Built TypeScript microservices'],
  technologies: ['TypeScript', 'Node.js'],
  url: '',
  github: '',
}

const photoProject: ResumeProject = {
  id: 'p2',
  name: 'Photo Album',
  description: 'Family photos',
  bullets: ['Cropped images in Photoshop'],
  technologies: ['Photoshop'],
  url: '',
  github: '',
}

describe('job-relevance', () => {
  it('scores JD-aligned projects higher', () => {
    expect(scoreProjectForJob(apiProject, job)).toBeGreaterThan(
      scoreProjectForJob(photoProject, job)
    )
  })

  it('keeps relevant project ids for ATS-focused inclusion', () => {
    const ids = selectRelevantProjectIds([apiProject, photoProject], job)
    expect(ids).toContain('p1')
    expect(ids).not.toContain('p2')
  })

  it('builds inclusion that prefers job-linked projects and skills', () => {
    const data = emptyProfileData()
    data.projects = [apiProject, photoProject]
    data.skills.technical = ['TypeScript', 'Photoshop', 'React']
    data.experience = [
      {
        id: 'e1',
        company: 'Acme',
        title: 'SE',
        location: '',
        startDate: '2022',
        endDate: '2024',
        current: false,
        bullets: ['Shipped features'],
        skills_used: [],
      },
    ]
    const inclusion = buildJobOptimizedInclusion(data, job)
    expect(inclusion.projectIds).toEqual(['p1'])
    expect(inclusion.skillIds?.[0]).toBe('typescript')
  })
})
