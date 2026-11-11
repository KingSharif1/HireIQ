import { describe, it, expect } from 'vitest'
import { resolveInboundApplication, type JobMatchCandidate } from '@/lib/email/inbound-match'
import { buildApplicationAlias } from '@/lib/email/application-alias'

const candidates: JobMatchCandidate[] = [
  { jobId: 'j1', applicationId: '550e8400-e29b-41d4-a716-446655440000', company: 'Acme', title: 'SWE' },
  { jobId: 'j2', applicationId: '660e8400-e29b-41d4-a716-446655440000', company: 'Globex', title: 'PM' },
]

describe('resolveInboundApplication', () => {
  it('resolves an exact alias to the right application', () => {
    const alias = buildApplicationAlias('550e8400-e29b-41d4-a716-446655440000', 'inbound.example.com')
    const res = resolveInboundApplication(candidates, {
      recipient: alias,
      from: 'someone@unrelated.com',
      subject: 'hello',
    })
    expect(res?.via).toBe('alias')
    expect(res?.match.applicationId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('falls back to fuzzy when the recipient is not an alias', () => {
    const res = resolveInboundApplication(candidates, {
      recipient: 'recruiter@acme.com',
      from: 'recruiter@acme.com',
      subject: 'Acme interview',
    })
    expect(res?.via).toBe('fuzzy')
    expect(res?.match.company).toBe('Acme')
  })

  it('returns null when an alias points to an unknown application and fuzzy misses', () => {
    const alias = buildApplicationAlias('770e8400-e29b-41d4-a716-446655440000', 'inbound.example.com')
    const res = resolveInboundApplication(candidates, {
      recipient: alias,
      from: 'someone@else.com',
      subject: 'hi',
    })
    expect(res).toBeNull()
  })
})
