/**
 * One-shot Aechelon tailor smoke. Loads TEST_USER_* from .env.local.
 * Usage: node docs/scripts/smoke-tailor-aechelon.mjs
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')
const envText = readFileSync(resolve(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      let v = l.slice(i + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      return [l.slice(0, i).trim(), v]
    })
)

const BASE = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const EMAIL = env.TEST_USER_EMAIL
const PASSWORD = env.TEST_USER_PASSWORD
const JOB_ID = '66176ab0-d88c-4b14-8906-f10769f51a9c'

if (!EMAIL || !PASSWORD) {
  console.error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const result = { ok: false, steps: [], error: null, url: null }

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  result.steps.push('opened login')

  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')
  await emailInput.click()
  await emailInput.fill('')
  await emailInput.pressSequentially(EMAIL, { delay: 15 })
  await passwordInput.click()
  await passwordInput.fill('')
  await passwordInput.pressSequentially(PASSWORD, { delay: 15 })
  await page.getByRole('button', { name: /^Sign in$/i }).click()
  await page.waitForTimeout(6000)
  result.url = page.url()
  if (!/dashboard/.test(result.url)) {
    result.error = `Login did not reach dashboard (still at ${result.url})`
    result.snippet = (await page.locator('body').innerText()).slice(0, 600)
    throw new Error(result.error)
  }
  result.steps.push('logged in')
  const tailorUrl = `${BASE}/dashboard/tracker/${JOB_ID}?tab=documents&docMode=ai-tailor`
  await page.goto(tailorUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  result.steps.push('opened ai-tailor')
  result.url = page.url()

  // Kick off if a start button is present
  const start = page.getByRole('button', { name: /start|tailor|generate|create/i }).first()
  if (await start.isVisible({ timeout: 5000 }).catch(() => false)) {
    await start.click()
    result.steps.push('clicked start')
  }  // Wait for either generating UI, review, or an error
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const body = (await page.locator('body').innerText()).slice(0, 4000)
    if (/Draft ready|Review|Match score|Writing your version|Matching this job|optional tip/i.test(body)) {
      result.ok = true
      result.steps.push('saw tailor progress/review UI')
      result.snippet = body.slice(0, 500)
      break
    }
    if (/Couldn.?t|failed|Try again|AI is not configured/i.test(body)) {
      result.error = body.match(/Couldn.?t[^\n]+|failed[^\n]+|Try again|AI is not configured/i)?.[0] || 'error UI'
      result.snippet = body.slice(0, 500)
      break
    }
    await page.waitForTimeout(2000)
  }
  if (!result.ok && !result.error) {
    result.error = 'Timed out waiting for tailor progress'
    result.snippet = (await page.locator('body').innerText()).slice(0, 500)
  }
} catch (err) {
  result.error = err instanceof Error ? err.message : String(err)
} finally {
  await browser.close()
}

console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
