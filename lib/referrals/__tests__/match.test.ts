import { describe, it, expect } from 'vitest'
import { companyMatchScore, rankReferralCandidates } from '@/lib/referrals/match'
import type { LinkedInConnection } from '@/types'

function conn(overrides: Partial<LinkedInConnection>): LinkedInConnection {
  return {
    id: 'c1',
    userId: 'u1',
    firstName: 'A',
    lastName: 'B',
    url: 'https://linkedin.com/in/a',
    company: 'Acme',
    position: 'Engineer',
    source: 'csv',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('companyMatchScore', () => {
  it('scores exact and suffix-stripped names', () => {
    expect(companyMatchScore('Acme Corp', 'Acme')).toBe(1)
    expect(companyMatchScore('Acme Technologies, Inc.', 'Acme')).toBe(1)
    expect(companyMatchScore('Acme', 'Globex')).toBe(0)
  })

  it('scores containment and token overlap', () => {
    expect(companyMatchScore('Acme Robotics', 'Acme')).toBe(0.85)
    // Distinct companies that only share a generic word are not a match.
    expect(companyMatchScore('Acme Systems', 'Acme Software')).toBe(0)
  })
})

describe('rankReferralCandidates', () => {
  it('ranks exact-company connections first and drops unrelated', () => {
    const ranked = rankReferralCandidates(
      [
        conn({ id: 'c1', company: 'Globex', firstName: 'G' }),
        conn({ id: 'c2', company: 'Acme', firstName: 'A' }),
        conn({ id: 'c3', company: 'Acme Robotics', firstName: 'R' }),
      ],
      'Acme',
    )
    expect(ranked.map((m) => m.connection.id)).toEqual(['c2', 'c3'])
    expect(ranked[0].strength).toBe(1)
    expect(ranked[1].reason).toContain('Acme')
  })
})
