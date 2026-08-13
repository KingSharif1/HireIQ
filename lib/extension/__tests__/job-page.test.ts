import { describe, expect, it } from 'vitest'
import { assertSavableJobUrl } from '@/lib/extension/job-page'

describe('assertSavableJobUrl', () => {
  it('blocks localhost and hireiq', () => {
    expect(assertSavableJobUrl('http://localhost:3000/dashboard')).toMatch(/Cannot save/)
    expect(assertSavableJobUrl('https://hireiq.app/dashboard')).toMatch(/Cannot save/)
    expect(assertSavableJobUrl('https://hireiq.kingsharif.com/dashboard')).toMatch(/Cannot save/)
  })

  it('allows known ATS / LinkedIn job URLs', () => {
    expect(assertSavableJobUrl('https://boards.greenhouse.io/acme/jobs/123')).toBeNull()
    expect(assertSavableJobUrl('https://www.linkedin.com/jobs/view/123')).toBeNull()
    expect(assertSavableJobUrl('https://www.amazon.jobs/en/jobs/10500800/digital-content-associate')).toBeNull()
    expect(assertSavableJobUrl('https://apply.careers.microsoft.com/careers?pid=1970393556944855')).toBeNull()
  })

  it('rejects random pages', () => {
    expect(assertSavableJobUrl('https://example.com/about')).toMatch(/doesn’t look/i)
  })
})
