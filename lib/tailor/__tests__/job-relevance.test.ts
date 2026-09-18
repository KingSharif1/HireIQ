import { describe, expect, it } from 'vitest'
import {
  buildJobOptimizedInclusion,
  formatPreferredProjectsForPrompt,
  isSparseJob,
  resolveJobDomainTags,
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

const mappingRobot: ResumeProject = {
  id: 'p-robot',
  name: 'Mapping Robot',
  description: 'Autonomous mapping on Raspberry Pi with LiDAR and ROS 2',
  bullets: ['Fused LiDAR scans for occupancy grids on embedded hardware'],
  technologies: ['ROS 2', 'Python', 'Raspberry Pi', 'LiDAR'],
  url: '',
  github: '',
}

const nemtWeb: ResumeProject = {
  id: 'p-web',
  name: 'NEMT Billing',
  description: 'SaaS billing dashboard',
  bullets: ['Built React admin for trip invoices'],
  technologies: ['React', 'TypeScript', 'Node.js'],
  url: '',
  github: '',
}

/** Emerson-class thin JD: hardware thesis, few keyword tokens. */
const emersonThin: JobExtractedData = {
  title: 'Software Engineer',
  company: 'Emerson',
  required_skills: ['C++'],
  preferred_skills: [],
  required_experience_years: 0,
  education_requirement: 'BS',
  keywords: ['embedded'],
  responsibilities: ['Develop software for industrial automation products'],
  ats_system: 'oracle',
  red_flags: [],
  company_values: [],
  compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
  work_type: 'onsite',
  seniority: 'junior',
  summary: 'Software engineer for embedded systems and hardware products.',
  role_thesis: 'Ship reliable software close to industrial hardware and controls.',
  domain_tags: ['embedded', 'hardware'],
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

  it('elevates hardware projects over web when JD domain is embedded/hardware', () => {
    expect(scoreProjectForJob(mappingRobot, emersonThin)).toBeGreaterThan(
      scoreProjectForJob(nemtWeb, emersonThin),
    )
    const ids = selectRelevantProjectIds([nemtWeb, mappingRobot, photoProject], emersonThin)
    expect(ids[0]).toBe('p-robot')
  })

  it('infers domain tags from sparse JD text when analyze tags missing', () => {
    const sparse: JobExtractedData = {
      ...emersonThin,
      role_thesis: undefined,
      domain_tags: undefined,
      required_skills: [],
      keywords: [],
      responsibilities: [],
      summary: 'Work on robotics firmware and LiDAR sensors.',
    }
    expect(isSparseJob(sparse)).toBe(true)
    const tags = resolveJobDomainTags(sparse)
    expect(tags).toEqual(expect.arrayContaining(['hardware']))
    expect(scoreProjectForJob(mappingRobot, sparse)).toBeGreaterThan(
      scoreProjectForJob(nemtWeb, sparse),
    )
  })

  it('formats preferred projects block for the tailor prompt', () => {
    const block = formatPreferredProjectsForPrompt(
      [nemtWeb, mappingRobot],
      emersonThin,
    )
    expect(block).toMatch(/PREFERRED PROJECTS/)
    expect(block).toMatch(/Mapping Robot/)
    expect(block.indexOf('Mapping Robot')).toBeLessThan(block.indexOf('NEMT'))
  })
})
