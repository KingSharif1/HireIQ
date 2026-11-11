import { describe, it, expect } from 'vitest'
import {
  classifyTableProbe,
  classifyCronResponse,
  classifyWorkerHealth,
  classifyWorkerAuth,
  classifyWorkerRun,
  classifyRouteProbe,
  isUuid,
  summarise,
  REQUIRED_TABLES,
  BASE_TABLES,
} from '@/lib/deploy/verify'

describe('classifyTableProbe', () => {
  it('passes on 200', () => {
    expect(classifyTableProbe('credit_grants', 200, '[]').ok).toBe(true)
  })

  it('flags PGRST205 as a missing migration', () => {
    const r = classifyTableProbe('credit_grants', 404, '{"code":"PGRST205","message":"Could not find the table"}')
    expect(r.ok).toBe(false)
    expect(r.detail).toContain('migration not applied')
  })

  it('does not call an unrelated 404 a missing migration', () => {
    const r = classifyTableProbe('credit_grants', 404, '{"message":"not found"}')
    expect(r.ok).toBe(false)
    expect(r.detail).not.toContain('migration not applied')
  })

  it('fails on 401 (wrong project/key)', () => {
    expect(classifyTableProbe('credit_grants', 401, '').ok).toBe(false)
  })
})

describe('classifyCronResponse', () => {
  it('treats 401 as "secret configured"', () => {
    const r = classifyCronResponse(401, '{"error":"Unauthorized"}')
    expect(r.ok).toBe(true)
    expect(r.detail).toContain('configured')
  })

  it('flags the skip body as missing CRON_SECRET', () => {
    const r = classifyCronResponse(200, '{"ok":true,"skipped":true,"reason":"CRON_SECRET not configured"}')
    expect(r.ok).toBe(false)
  })

  it('passes a real mint response', () => {
    expect(classifyCronResponse(200, '{"ok":true,"minted":3}').ok).toBe(true)
  })

  it('fails on 500', () => {
    expect(classifyCronResponse(500, '{"error":"boom"}').ok).toBe(false)
  })
})

describe('worker probes', () => {
  it('passes a healthy worker', () => {
    expect(classifyWorkerHealth(200, '{"ok":true,"service":"hireiq-apply-worker"}').ok).toBe(true)
  })

  it('fails an unhealthy worker', () => {
    expect(classifyWorkerHealth(502, 'Bad Gateway').ok).toBe(false)
  })

  it('expects 401 for a bad bearer', () => {
    expect(classifyWorkerAuth(401).ok).toBe(true)
    expect(classifyWorkerAuth(200).ok).toBe(false)
  })

  it('validates run ids as uuids', () => {
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true)
    expect(isUuid('test')).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })

  it('detects a missing SUPABASE_SERVICE_ROLE_KEY on the worker', () => {
    const r = classifyWorkerRun(500, '{"error":"SUPABASE_SERVICE_ROLE_KEY (and URL) required for extension API"}')
    expect(r.ok).toBe(false)
    expect(r.detail).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('passes when the worker reaches the database', () => {
    expect(classifyWorkerRun(404, '{"error":"run not found"}').ok).toBe(true)
  })

  it('fails when the worker rejects the shared secret', () => {
    expect(classifyWorkerRun(401, '{"error":"Unauthorized"}').ok).toBe(false)
  })

  it('passes an accepted run', () => {
    expect(classifyWorkerRun(200, '{"ok":true}').ok).toBe(true)
  })
})

describe('classifyRouteProbe', () => {
  it('passes an auth-gated route', () => {
    const check = classifyRouteProbe('/api/agent/daily-run', 401, '{"error":"Unauthorized"}')
    expect(check.ok).toBe(true)
    expect(check.detail).toContain('auth-gated')
  })

  it('fails a missing route', () => {
    const check = classifyRouteProbe('/api/agent/daily-run', 404, '')
    expect(check.ok).toBe(false)
    expect(check.detail).toContain('not deployed')
  })

  it('fails a route that answers without auth', () => {
    const check = classifyRouteProbe('/api/agent/daily-run', 200, '{}')
    expect(check.ok).toBe(false)
    expect(check.detail).toContain('without auth')
  })

  it('fails a 5xx', () => {
    expect(classifyRouteProbe('/api/agent/daily-run', 500, 'boom').ok).toBe(false)
  })
})

describe('summarise', () => {  it('reports nothing failing when all pass', () => {
    expect(summarise([{ name: 'a', ok: true, detail: '' }])).toEqual({ ok: true, failing: [] })
  })

  it('lists failing check names', () => {
    const s = summarise([
      { name: 'a', ok: true, detail: '' },
      { name: 'b', ok: false, detail: '' },
    ])
    expect(s.ok).toBe(false)
    expect(s.failing).toEqual(['b'])
  })
})

describe('table lists', () => {
  it('covers both migrations', () => {
    expect(REQUIRED_TABLES).toContain('credit_grants')
    expect(REQUIRED_TABLES).toContain('linkedin_connections')
  })

  it('has base tables separate from required ones', () => {
    expect(BASE_TABLES).toContain('profiles')
    expect(REQUIRED_TABLES as readonly string[]).not.toContain('profiles')
  })
})
