import { describe, it, expect } from 'vitest'
import { buildReferralDraftPrompt } from '@/lib/referrals/draft-prompt'

const input = {
  connectionName: 'Ada',
  connectionCompany: 'Acme',
  connectionPosition: 'Staff Engineer',
  targetCompany: 'Globex',
  targetRole: 'Backend Engineer',
  candidateSummary: 'Full-stack engineer who shipped a SaaS used by 10k teams.',
  kind: 'direct_referral' as const,
}

describe('buildReferralDraftPrompt', () => {
  it('includes the connection, target, and candidate facts', () => {
    const p = buildReferralDraftPrompt(input)
    expect(p).toContain('Ada')
    expect(p).toContain('Acme')
    expect(p).toContain('Globex')
    expect(p).toContain('Backend Engineer')
    expect(p).toContain('10k teams')
  })

  it('enforces the honesty + voice constraints', () => {
    const p = buildReferralDraftPrompt(input)
    expect(p).toContain('NEVER invent a relationship')
    expect(p).toContain('no em-dashes')
    expect(p).toContain('Return ONLY the message text')
  })

  it('distinguishes warm intro from direct referral', () => {
    expect(buildReferralDraftPrompt({ ...input, kind: 'warm_intro' })).toContain('warm-intro')
    expect(buildReferralDraftPrompt({ ...input, kind: 'direct_referral' })).toContain('refer you')
  })
})
