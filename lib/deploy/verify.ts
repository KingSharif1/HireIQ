/**
 * Deployment verification primitives (pure — no network).
 *
 * Used by `scripts/verify-deployment.ts` and unit-tested so the classification
 * logic stays honest: a "pass" here means the deployed app really can see the
 * table / really has the cron secret, not just that a request returned 2xx.
 */

export interface DeployCheck {
  name: string
  ok: boolean
  detail: string
}

/** Tables added by migration 028 (credits) + 029 (LinkedIn referrals). */
export const REQUIRED_TABLES = [
  'credit_grants',
  'credit_usages',
  'linkedin_connections',
  'referral_contacts',
  'referral_outreach',
] as const

/** Pre-existing tables — if these fail, the problem is the project/key, not the migrations. */
export const BASE_TABLES = ['profiles', 'jobs', 'applications'] as const

/** 404 + PGRST205 is PostgREST's "no such table"; anything else is a different problem. */
export function classifyTableProbe(table: string, httpStatus: number, body: string): DeployCheck {
  const trimmed = body.trim().slice(0, 160)
  if (httpStatus === 200) return { name: `table:${table}`, ok: true, detail: 'exists' }
  if (httpStatus === 404 && trimmed.includes('PGRST205')) {
    return { name: `table:${table}`, ok: false, detail: 'missing — migration not applied to this project' }
  }
  return { name: `table:${table}`, ok: false, detail: `HTTP ${httpStatus}: ${trimmed}` }
}

/**
 * The credit-mint route fails safe: with no CRON_SECRET it answers
 * 200 `{ok:true, skipped:true}`; with one, an unauthenticated caller gets 401.
 * So a 401 is a PASS for "secret configured", and the skipped body is a FAIL.
 */
export function classifyCronResponse(httpStatus: number, body: string): DeployCheck {
  const name = 'cron:credit-mint'
  if (httpStatus === 401) {
    return { name, ok: true, detail: 'CRON_SECRET configured (401 to unauthenticated caller)' }
  }
  if (httpStatus === 200) {
    if (/"skipped"\s*:\s*true/.test(body)) {
      return { name, ok: false, detail: 'CRON_SECRET not configured — route self-reports skipped' }
    }
    return { name, ok: true, detail: 'mint endpoint responded' }
  }
  return { name, ok: false, detail: `HTTP ${httpStatus}: ${body.trim().slice(0, 120)}` }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A run id the worker will refuse quickly (no such run) still proves auth + reachability. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function classifyWorkerHealth(httpStatus: number, body: string): DeployCheck {
  const name = 'worker:health'
  const trimmed = body.trim().slice(0, 120)
  if (httpStatus === 200 && /"ok"\s*:\s*true/.test(trimmed)) {
    return { name, ok: true, detail: trimmed }
  }
  return { name, ok: false, detail: `HTTP ${httpStatus}: ${trimmed}` }
}

export function classifyWorkerAuth(httpStatus: number): DeployCheck {
  const name = 'worker:auth'
  if (httpStatus === 401) return { name, ok: true, detail: 'rejects unauthenticated /run (401)' }
  return { name, ok: false, detail: `expected 401 for a bad bearer, got HTTP ${httpStatus}` }
}

/**
 * POST /run with a bogus-but-valid run id and the real shared secret.
 * This is the only way to detect, remotely, whether the worker actually has its
 * Supabase env: with the key it reaches the DB and reports "run not found";
 * without it, processApplyRun throws before touching Supabase.
 */
export function classifyWorkerRun(httpStatus: number, body: string): DeployCheck {
  const name = 'worker:run-config'
  const trimmed = body.trim().slice(0, 200)
  if (httpStatus === 401) {
    return { name, ok: false, detail: 'worker rejected the shared secret — APPLY_WORKER_SECRET mismatch' }
  }
  if (httpStatus === 200) return { name, ok: true, detail: 'run accepted' }
  if (/SUPABASE_SERVICE_ROLE_KEY/i.test(trimmed)) {
    return { name, ok: false, detail: 'worker is missing SUPABASE_SERVICE_ROLE_KEY — cannot process runs' }
  }
  if (httpStatus === 404 || /not found|no such run|unknown run/i.test(trimmed)) {
    return { name, ok: true, detail: 'worker reached the database (bogus run rejected as expected)' }
  }
  return { name, ok: false, detail: `HTTP ${httpStatus}: ${trimmed}` }
}

export function summarise(checks: DeployCheck[]): { ok: boolean; failing: string[] } {
  const failing = checks.filter((c) => !c.ok).map((c) => c.name)
  return { ok: failing.length === 0, failing }
}
