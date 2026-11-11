import { describe, it, expect } from 'vitest'
import {
  buildApplicationAlias,
  applicationIdFromAlias,
  isApplicationAlias,
} from '@/lib/email/application-alias'

const UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('buildApplicationAlias', () => {
  it('mints a reversible alias with the full UUID in the local part', () => {
    expect(buildApplicationAlias(UUID, 'inbound.example.com')).toBe(
      `hireiq.${UUID}@inbound.example.com`,
    )
  })

  it('normalizes domain casing/leading @', () => {
    expect(buildApplicationAlias(UUID, '@Inbound.Example.com')).toBe(
      `hireiq.${UUID}@inbound.example.com`,
    )
  })

  it('rejects non-UUID application ids', () => {
    expect(() => buildApplicationAlias('not-a-uuid', 'x.com')).toThrow()
  })
})

describe('applicationIdFromAlias', () => {
  it('round-trips the uuid', () => {
    const alias = buildApplicationAlias(UUID, 'inbound.example.com')
    expect(applicationIdFromAlias(alias)).toBe(UUID)
  })

  it('handles display names and angle brackets, case-insensitively', () => {
    expect(applicationIdFromAlias(`Acme Recruiting <HireIQ.${UUID.toUpperCase()}@inbound.example.com>`)).toBe(UUID)
  })

  it('returns null for a normal address', () => {
    expect(applicationIdFromAlias('recruiter@acme.com')).toBeNull()
    expect(isApplicationAlias('recruiter@acme.com')).toBe(false)
  })
})
