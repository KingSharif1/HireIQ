import { describe, it, expect } from 'vitest'
import { decodeJwtPayload, findSupabaseProjectInBundle } from '@/lib/deploy/verify'

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (payload: object) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.c2lnbmF0dXJlLXBsYWNlaG9sZGVy`

const REF = 'abcdefghijklmnopqrst'
const ANON = jwt({ iss: 'supabase', ref: REF, role: 'anon', iat: 1, exp: 2 })
const DECOY = jwt({ sub: '1234567890', name: 'John Doe', iat: 1516239022 })

describe('findSupabaseProjectInBundle', () => {
  it('skips JWT-shaped decoys and picks the role=anon key, even in a later chunk', () => {
    const found = findSupabaseProjectInBundle([`const demo="${DECOY}"`, `x("${ANON}")`])
    expect(found).toEqual({ anonKey: ANON, ref: REF })
  })

  it('ignores service_role or ref-less tokens', () => {
    const svc = jwt({ ref: REF, role: 'service_role' })
    const noRef = jwt({ role: 'anon' })
    expect(findSupabaseProjectInBundle([svc, noRef]).anonKey).toBeNull()
  })

  it('falls back to the bundled project URL for the ref', () => {
    const found = findSupabaseProjectInBundle([`a="${DECOY}"`, `u="https://${REF}.supabase.co"`])
    expect(found).toEqual({ anonKey: null, ref: REF })
  })

  it('returns nulls when nothing is there', () => {
    expect(findSupabaseProjectInBundle(['console.log(1)'])).toEqual({ anonKey: null, ref: null })
  })
})

describe('decodeJwtPayload', () => {
  it('decodes unpadded base64url payloads and rejects junk', () => {
    expect(decodeJwtPayload(ANON)?.ref).toBe(REF)
    expect(decodeJwtPayload('nope')).toBeNull()
    expect(decodeJwtPayload('a.!!!.b')).toBeNull()
  })
})
