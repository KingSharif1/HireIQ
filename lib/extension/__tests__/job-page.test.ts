import { describe, expect, it } from 'vitest'
import { assertSavableJobUrl } from '@/lib/extension/job-page'

describe('assertSavableJobUrl', () => {
  it('blocks localhost and hireiq', () => {
    expect(assertSavableJobUrl('http://localhost:3000/dashboard')).toMatch(/Cannot save/)
    expect(assertSavableJobUrl('https://hireiq.app/dashboard')).toMatch(/Cannot save/)
  })

  it('allows known ATS / LinkedIn job URLs', () => {
    expect(assertSavableJobUrl('https://boards.greenhouse.io/acme/jobs/123')).toBeNull()
    expect(assertSavableJobUrl('https://www.linkedin.com/jobs/view/123')).toBeNull()
    expect(assertSavableJobUrl('https://jobs.lever.co/acme/abc')).toBeNull()
  })

  it('rejects random pages', () => {
    expect(assertSavableJobUrl('https://example.com/about')).toMatch(/doesn’t look/i)
  })
})
