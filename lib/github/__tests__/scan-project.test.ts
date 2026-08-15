import { describe, expect, it } from 'vitest'
import { scanLinkedRepo, projectFromRepo } from '@/lib/github/scan-project'
import type { GitHubRepoSnapshot } from '@/lib/github/types'
import type { ResumeProject } from '@/types'

const repo = (over: Partial<GitHubRepoSnapshot> = {}): GitHubRepoSnapshot => ({
  id: 1,
  name: 'nemt-billing',
  fullName: 'dev/nemt-billing',
  htmlUrl: 'https://github.com/dev/nemt-billing',
  description: 'Billing for non-emergency medical transport',
  languages: ['TypeScript'],
  stars: 0,
  pushedAt: new Date().toISOString(),
  status: 'active',
  topics: [],
  isFork: false,
  isPrivate: false,
  tools: ['next', 'stripe', 'strapi'],
  ...over,
})

const project = (over: Partial<ResumeProject> = {}): ResumeProject => ({
  id: 'p1',
  name: 'NEMT Billing',
  description: '',
  bullets: ['Shipped Stripe invoicing for dispatchers'],
  technologies: ['Next.js'],
  url: '',
  github: 'https://github.com/dev/nemt-billing',
  ...over,
})

describe('scanLinkedRepo', () => {
  it('asks to link when no repo is attached', () => {
    const result = scanLinkedRepo(project({ github: '', name: 'Unrelated side hustle' }), [repo()])
    expect(result.kind).toBe('none')
  })

  it('returns a highlight for a linked repo', () => {
    const result = scanLinkedRepo(project({ bullets: [''] }), [repo()])
    expect(result.kind).toBe('highlight')
    if (result.kind === 'highlight') {
      expect(result.bullet.toLowerCase()).toMatch(/billing|stripe|next/)
      expect(result.bullet).not.toContain('<div')
    }
  })
})

describe('projectFromRepo', () => {
  it('fills a resume-shaped project from the last GitHub sync', () => {
    const project = projectFromRepo(repo(), 'proj-new')
    expect(project.id).toBe('proj-new')
    expect(project.github).toBe('https://github.com/dev/nemt-billing')
    expect(project.source).toBe('github')
    expect(project.name.toLowerCase()).toContain('nemt')
    expect(project.bullets.length).toBeGreaterThan(0)
    expect(project.bullets[0]).not.toContain('<div')
  })
})
