import { describe, it, expect } from 'vitest'
import { navFor } from '@/components/shared/primary-nav'

describe('primary nav v2 flag', () => {
  it('v1 nav centers on dashboard, applications, profile and resume builder', () => {
    expect(navFor(false).map((n) => n.label)).toEqual(['Dashboard', 'Applications', 'Profile', 'Resume Builder'])
  })
  it('v2 flag brings back Scout and Referrals', () => {
    const labels = navFor(true).map((n) => n.label)
    expect(labels).toContain('Scout')
    expect(labels).toContain('Referrals')
  })
})
