import { describe, expect, it } from 'vitest'
import { normalizeApplyUrl } from '@/lib/extension/normalize-url'

describe('normalizeApplyUrl', () => {
  it('strips hash and utm params', () => {
    const a =
      'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008?utm_source=linkedin#apply'
    const b = 'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008'
    expect(normalizeApplyUrl(a)).toBe(b)
  })

  it('keeps meaningful query like gh_jid', () => {
    const u = 'https://boards.greenhouse.io/acme/jobs/1?gh_jid=99&utm_medium=email'
    expect(normalizeApplyUrl(u)).toBe('https://boards.greenhouse.io/acme/jobs/1?gh_jid=99')
  })
})
