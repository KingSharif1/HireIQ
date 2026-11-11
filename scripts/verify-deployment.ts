/**
 * One-shot deployment verification for HireIQ.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-deployment.ts
 *   npm run verify:deploy
 *
 * Env (all optional):
 *   APP_URL        default https://hireiq.kingsharif.com
 *   ANON_KEY       default: extracted from the deployed client bundle
 *   WORKER_BASE    e.g. http://163.192.106.154:8080 (or APPLY_WORKER_URL, /run stripped)
 *
 * Exit code 0 = every check passed, 1 = something is wrong (names printed).
 */
import {
  REQUIRED_TABLES,
  BASE_TABLES,
  classifyTableProbe,
  classifyCronResponse,
  classifyWorkerHealth,
  classifyWorkerAuth,
  summarise,
  type DeployCheck,
} from '@/lib/deploy/verify'

const APP = (process.env.APP_URL ?? 'https://hireiq.kingsharif.com').replace(/\/$/, '')
const WORKER = (process.env.WORKER_BASE ?? process.env.APPLY_WORKER_URL ?? '')
  .replace(/\/run\/?$/, '')
  .replace(/\/$/, '')

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

async function fetchAnonFromBundle(): Promise<string | null> {
  const html = await (await fetch(`${APP}/login`)).text()
  const srcs = [...new Set([...html.matchAll(/["']((?:https?:\/\/[^"']+)?\/_next\/[^"']+\.js[^"']*)["']/g)].map((m) => m[1]))]
  for (const src of srcs) {
    const abs = src.startsWith('http') ? src : `${APP}${src}`
    const js = await (await fetch(abs)).text().catch(() => '')
    const key = js.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/)
    if (key) return key[0]
  }
  return null
}

async function main() {
  const checks: DeployCheck[] = []

  // 1. App reachable
  try {
    const r = await fetch(APP)
    checks.push({ name: 'app:reachable', ok: r.status < 500, detail: `HTTP ${r.status}` })
  } catch (err) {
    checks.push({ name: 'app:reachable', ok: false, detail: err instanceof Error ? err.message : 'unreachable' })
    report(checks)
    return
  }

  // 2. Anon key + project URL
  const anon = process.env.ANON_KEY ?? (await fetchAnonFromBundle())
  if (!anon) {
    checks.push({ name: 'project:anon-key', ok: false, detail: 'not found in the deployed bundle — pass ANON_KEY' })
    report(checks)
    return
  }
  const ref = decodeJwtPayload(anon)?.ref
  const projectUrl = typeof ref === 'string' ? `https://${ref}.supabase.co` : null
  checks.push({
    name: 'project:anon-key',
    ok: Boolean(projectUrl),
    detail: projectUrl ?? 'could not derive project ref from the anon key',
  })
  if (!projectUrl) {
    report(checks)
    return
  }

  // 3. Tables
  const probe = async (table: string) => {
    const r = await fetch(`${projectUrl}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    })
    return classifyTableProbe(table, r.status, await r.text())
  }
  for (const t of BASE_TABLES) checks.push(await probe(t))
  for (const t of REQUIRED_TABLES) checks.push(await probe(t))

  // 4. Cron secret
  try {
    const r = await fetch(`${APP}/api/cron/credit-mint`)
    checks.push(classifyCronResponse(r.status, await r.text()))
  } catch (err) {
    checks.push({ name: 'cron:credit-mint', ok: false, detail: err instanceof Error ? err.message : 'unreachable' })
  }

  // 5. Worker health + auth (optional)
  if (WORKER) {
    try {
      const h = await fetch(`${WORKER}/health`)
      checks.push(classifyWorkerHealth(h.status, await h.text()))
      const bad = await fetch(`${WORKER}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer definitely-wrong' },
        body: '{}',
      })
      checks.push(classifyWorkerAuth(bad.status))
    } catch (err) {
      checks.push({ name: 'worker:health', ok: false, detail: err instanceof Error ? err.message : 'unreachable' })
    }
  } else {
    checks.push({ name: 'worker:health', ok: false, detail: 'skipped — set WORKER_BASE or APPLY_WORKER_URL to verify' })
  }

  report(checks)
}

function report(checks: DeployCheck[]) {
  console.log(`\nHireIQ deployment verification — ${APP}`)
  console.log('-'.repeat(72))
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(28)} ${c.detail}`)
  }
  console.log('-'.repeat(72))
  const { ok, failing } = summarise(checks)
  if (ok) {
    console.log('RESULT: all checks passed\n')
    process.exit(0)
  }
  console.log(`RESULT: ${failing.length} failing — ${failing.join(', ')}\n`)
  process.exit(1)
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
