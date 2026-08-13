import { chromium } from 'playwright'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'

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

const BASE = process.env.BASE_URL || 'https://hireiq.kingsharif.com'
const EMAIL = process.env.TEST_USER_EMAIL
const PASSWORD = process.env.TEST_USER_PASSWORD
const GREENHOUSE_JOB = '66176ab0-d88c-4b14-8906-f10769f51a9c'
const ASHBY_JOB = process.env.TEST_JOB_ID || '9eee3c93-676b-46ec-a4e5-6a60f8285135'
const OUT = '.ui-audit'
const VIEWPORT = { width: 1440, height: 900 }

if (!EMAIL || !PASSWORD) {
  console.error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD')
  process.exit(3)
}

mkdirSync(OUT, { recursive: true })

function pass(label, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`)
  return ok
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL('**/dashboard**', { timeout: 20000 })
    return true
  } catch {
    return false
  }
}

async function listButtons(page, limit = 25) {
  return page.evaluate((max) => {
    const els = [...document.querySelectorAll('button, a[role="button"], input[type="submit"], a.btn, a[class*="button"]')]
    return els
      .map((el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, max)
  }, limit)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()
  let failed = 0

  const loggedIn = await login(page)
  if (!pass('Login', loggedIn, page.url())) {
    await page.screenshot({ path: `${OUT}/masked-login-fail.png`, fullPage: true })
    await browser.close()
    process.exit(2)
  }

  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const maskedRadio = page.getByRole('radio', { name: /Application email/i })
  const maskedChecked = await maskedRadio.getAttribute('aria-checked')
  const address = await page.locator('input[readonly]').first().inputValue().catch(() => '')
  const forwardOn = await page.locator('label:has-text("Forward a copy") input[type="checkbox"]').isChecked().catch(() => false)
  await page.screenshot({ path: `${OUT}/settings-masked-email.png`, fullPage: true })
  if (!pass('Settings: Application email selected', maskedChecked === 'true', `aria-checked=${maskedChecked}`)) failed++
  if (!pass('Settings: masked address shown', /@mail\.kingsharif\.com$/i.test(address), address || 'empty')) failed++
  if (!pass('Settings: forward-to-inbox on', forwardOn)) failed++

  await page.goto(`${BASE}/dashboard/tracker/${GREENHOUSE_JOB}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const apply = page.getByRole('link', { name: /^Apply$/ })
  const viewOriginal = page.getByRole('link', { name: /View original/i })
  const copyEmail = page.getByRole('button', { name: /Copy apply email/i })
  const hasApply = await apply.count()
  const hasView = await viewOriginal.count()
  const hasCopy = await copyEmail.count()
  await page.screenshot({ path: `${OUT}/job-greenhouse-detail.png`, fullPage: true })
  if (!pass('Greenhouse job: Apply', hasApply > 0)) failed++
  if (!pass('Greenhouse job: View original', hasView > 0)) failed++
  pass('Greenhouse job: Copy apply email (needs PR #3 on prod)', hasCopy > 0, hasCopy ? 'present' : 'not on prod yet')

  const emailTab = page.getByRole('tab', { name: /^Email$/i }).or(page.getByRole('button', { name: /^Email$/i })).or(page.getByText(/^Email$/))
  if (await emailTab.count()) {
    await emailTab.first().click().catch(() => {})
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/job-greenhouse-email.png`, fullPage: true })
    pass('Greenhouse job: Email tab', true)
  }

  const applyHref = hasApply ? await apply.first().getAttribute('href') : null
  if (applyHref) {
    const ats = await context.newPage()
    await ats.goto(applyHref, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await ats.waitForTimeout(2500)
    const applyBtn = ats.getByRole('button', { name: /Apply/i })
    if (await applyBtn.count()) {
      await applyBtn.first().click().catch(() => {})
      await ats.waitForTimeout(1500)
    }
    const labels = await listButtons(ats)
    const body = await ats.locator('body').innerText().catch(() => '')
    const hasAutofill = /autofill my application/i.test(body)
    const hasSubmit = /submit application/i.test(body)
    const hasEmailField = await ats.locator('input[type="email"], input[name*="email" i]').count()
    await ats.screenshot({ path: `${OUT}/greenhouse-apply-form.png`, fullPage: true })
    if (!pass('Greenhouse posting: email field', hasEmailField > 0, `count=${hasEmailField}`)) failed++
    pass('Greenhouse posting: Autofill my application', hasAutofill)
    pass('Greenhouse posting: Submit application', hasSubmit)
    console.log('  buttons:', labels.slice(0, 12).join(' | ') || '(none labeled)')
    await ats.close()
  } else {
    failed++
    pass('Greenhouse posting opened', false, 'no Apply href')
  }

  await page.goto(`${BASE}/dashboard/tracker/${ASHBY_JOB}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const ashbyApply = page.getByRole('link', { name: /^Apply$/ })
  const portal = page.getByText(/Portal login/i)
  await page.screenshot({ path: `${OUT}/job-ashby-detail.png`, fullPage: true })
  pass('Ashby job: Apply', (await ashbyApply.count()) > 0)
  pass('Ashby job: Portal login section', (await portal.count()) > 0)

  const ashbyHref = (await ashbyApply.count()) ? await ashbyApply.first().getAttribute('href') : null
  if (ashbyHref) {
    const ats = await context.newPage()
    await ats.goto(ashbyHref, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await ats.waitForTimeout(2500)
    const labels = await listButtons(ats)
    const emailCount = await ats.locator('input[type="email"], input[name*="email" i]').count()
    await ats.screenshot({ path: `${OUT}/ashby-apply-form.png`, fullPage: true })
    pass('Ashby posting: email/apply controls', emailCount > 0 || labels.length > 0, `emails=${emailCount}`)
    console.log('  buttons:', labels.slice(0, 12).join(' | ') || '(none labeled)')
    await ats.close()
  }

  await page.goto(`${BASE}/dashboard/tracker?view=outreach`, { waitUntil: 'networkidle' }).catch(() =>
    page.goto(`${BASE}/dashboard/tracker`, { waitUntil: 'networkidle' }),
  )
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/outreach.png`, fullPage: true })
  const outreachText = await page.locator('body').innerText()
  pass('All outreach visible', /outreach|unmatched|inbox|email/i.test(outreachText))

  await browser.close()
  console.log(failed ? `\nDONE with ${failed} failure(s)` : '\nDONE all required checks passed')
  process.exit(failed ? 1 : 0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
