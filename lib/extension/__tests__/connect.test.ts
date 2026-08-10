import { describe, expect, it } from 'vitest'
import { generateConnectCode, hashConnectCode } from '@/lib/extension/connect'
import { detectAuthWallFromSignals } from '@/lib/extension/detect-auth-wall'

describe('extension connect codes', () => {
  it('generates hiqc_ codes and hashes stably', () => {
    const a = generateConnectCode()
    expect(a.startsWith('hiqc_')).toBe(true)
    expect(hashConnectCode(a)).toBe(hashConnectCode(` ${a} `))
    expect(hashConnectCode(a)).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('detectAuthWallFromSignals', () => {
  it('flags signup pages with password + create account copy', () => {
    const result = detectAuthWallFromSignals({
      text: 'Create an account Sign up to apply',
      passwordCount: 1,
      applyFieldCount: 0,
    })
    expect(result.needsAccount).toBe(true)
    expect(result.kind).toBe('signup')
  })

  it('does not flag greenhouse-style apply forms', () => {
    const result = detectAuthWallFromSignals({
      text: 'Apply for this job',
      passwordCount: 0,
      applyFieldCount: 3,
    })
    expect(result.needsAccount).toBe(false)
    expect(result.kind).toBe('apply')
  })
})
