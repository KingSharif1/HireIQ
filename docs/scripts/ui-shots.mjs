import { chromium } from 'playwright'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'

// Load TEST_USER_* from .env.local (gitignored) without printing secrets.
function loadEnvLocal() {
  if (!existsSync('.env.local')) return
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnvLocal()

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const EMAIL = process.env.TEST_USER_EMAIL
const PASSWORD = process.env.TEST_USER_PASSWORD
const JOB_ID = process.env.TEST_JOB_ID || '9eee3c93-676b-46ec-a4e5-6a60f8285135'
const OUT = '.ui-audit'
const VIEWPORT = { width: 1440, height: 900 }

if (!EMAIL || !PASSWORD) {
  console.error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD.')
  console.error('Add these two lines to .env.local (gitignored):')
  console.error('  TEST_USER_EMAIL=you@example.com')
  console.error('  TEST_USER_PASSWORD=your-password')
  process.exit(3)
}

const ROUTES = [
  ['applications', '/dashboard'],
  ['tailor', '/dashboard/tailor'],
  ['add-job', '/dashboard/jobs'],
  ['job-hub', `/dashboard/jobs/${JOB_ID}`],
  ['profile', '/dashboard/profile'],
  ['notifications', '/dashboard/notifications'],
]

mkdirSync(OUT, { recursive: true })

// Visible browser: node docs/scripts/ui-shots.mjs --headed
// Or: npm run ui:shots:headed
const HEADED = process.argv.includes('--headed') || process.env.PW_HEADED === '1'
const SLOW_MO = HEADED ? 250 : 0

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL('**/dashboard**', { timeout: 12000 })
    console.log('Logged in.')
    return true
  } catch {
    const err = await page.locator('p.text-destructive, .text-destructive').first().textContent().catch(() => null)
    console.log(`Login failed (url: ${page.url()}) error: ${err?.trim() || 'none'}`)
    return false
  }
}

async function setTheme(page, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('theme', t) } catch {}
  }, theme)
}

async function run() {
  if (HEADED) {
    console.log('Launching Chromium in HEADED mode — you should see a browser window.')
  } else {
    console.log('Launching Chromium headless (no window). Use --headed to watch.')
  }

  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: SLOW_MO,
  })
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  const page = await context.newPage()

  // Capture the login screen (light + dark) before authenticating.
  for (const theme of ['dark', 'light']) {
    await setTheme(page, theme)
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/login-${theme}.png`, fullPage: true })
    console.log(`shot: login-${theme}`)
  }

  const ok = await login(page)
  if (!ok) {
    console.error('LOGIN FAILED — capturing nothing else')
    await browser.close()
    process.exit(2)
  }

  for (const theme of ['dark', 'light']) {
    await setTheme(page, theme)
    for (const [name, route] of ROUTES) {
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(1200)
        await page.screenshot({ path: `${OUT}/${name}-${theme}.png`, fullPage: true })
        console.log(`shot: ${name}-${theme}`)
      } catch (e) {
        console.error(`failed ${name}-${theme}:`, e.message)
      }
    }
  }

  await browser.close()
  console.log('DONE')
}

run().catch((e) => { console.error(e); process.exit(1) })
