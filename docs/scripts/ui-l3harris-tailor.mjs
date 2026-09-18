/**
 * E2E: paste L3Harris job URL → Fetch & Analyze → Tailor with AI → capture review.
 * Usage: node docs/scripts/ui-l3harris-tailor.mjs [--headed]
 * Does not close the browser when --headed (waits for Enter / 10 min).
 */
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

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
const JOB_URL =
  process.env.TEST_JOB_URL ||
  'https://careers.l3harris.com/en/job/-/-/4832/98544143520?p_sid=O9oxQeb&p_uid=y6epucbAMT&ss=paid&utm_campaign=msl_supplemental_advancedeffects&utm_content=pj_board&utm_medium=jobad&utm_source=indeed'
const OUT = '.ui-audit'
const HEADED = process.argv.includes('--headed') || process.env.PW_HEADED === '1'

if (!EMAIL || !PASSWORD) {
  console.error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD in .env.local')
  process.exit(3)
}

mkdirSync(OUT, { recursive: true })

async function shot(page, name) {
  const path = `${OUT}/l3harris-${name}.png`
  await page.screenshot({ path, fullPage: true })
  console.log(`shot ${path}`)
  return path
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 20000 })
  console.log('logged in')
}

async function run() {
  console.log(HEADED ? 'HEADED Chromium' : 'headless Chromium')
  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 80 : 0,
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const report = {
    jobUrl: JOB_URL,
    steps: [],
    ok: false,
    errors: [],
    reviewText: '',
    score: null,
  }

  try {
    await login(page)

    await page.goto(`${BASE}/dashboard/jobs`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('tab', { name: /Job URL/i }).click().catch(() => {})
    const urlInput = page.locator('input[placeholder*="greenhouse"], input[placeholder*="http"]').first()
    await urlInput.waitFor({ state: 'visible', timeout: 15000 })
    await urlInput.fill(JOB_URL)
    await shot(page, '01-url-filled')
    report.steps.push('url-filled')

    await page.getByRole('button', { name: /Fetch & Analyze/i }).click()
    console.log('fetching…')
    await page.getByText(/Job Analyzed|Ready to tailor/i).first().waitFor({ timeout: 120000 })
    await shot(page, '02-analyzed')
    const analyzedTitle = await page.locator('h1, [class*="CardTitle"]').filter({ hasText: /./ }).first().textContent().catch(() => '')
    report.steps.push(`analyzed:${(analyzedTitle || '').trim().slice(0, 80)}`)
    console.log('analyzed')

    await page.getByRole('link', { name: /Tailor resume for this job/i }).click()
    await page.waitForURL('**/tracker/**', { timeout: 30000 })
    await shot(page, '03-tracker-docs')
    report.steps.push(`tracker:${page.url()}`)

    // Choose Tailor with AI (chooser) or open if already there
    const tailorAi = page.getByText(/Tailor with AI/i).first()
    if (await tailorAi.isVisible({ timeout: 8000 }).catch(() => false)) {
      await tailorAi.click()
    } else {
      // Maybe need Create / New resume
      const create = page.getByRole('button', { name: /Create|New resume|Tailor/i }).first()
      if (await create.isVisible({ timeout: 5000 }).catch(() => false)) {
        await create.click()
        await page.getByText(/Tailor with AI/i).first().click({ timeout: 10000 })
      }
    }

    console.log('waiting for tailor draft (up to 4 min)…')
    // Draft-first: should go to Writing… then Review — not a pre-draft quiz
    const review = page.getByText(/Review this version|Ready to review|Optional tips/i).first()
    const writing = page.getByText(/Writing a version|Writing your version|Reviewing this job/i).first()
    await Promise.race([
      writing.waitFor({ timeout: 30000 }).catch(() => {}),
      review.waitFor({ timeout: 30000 }).catch(() => {}),
    ])
    await shot(page, '04-tailoring')

    // Fail if stuck on pre-draft questions for long without generate
    const questionsFirst = page.getByText(/Question 1 of|Needs a couple of answers/i)
    if (await questionsFirst.isVisible({ timeout: 3000 }).catch(() => false)) {
      report.errors.push('Saw pre-draft Q&A — draft-first may not have fired')
      await shot(page, '04b-pre-draft-qa')
    }

    await review.waitFor({ timeout: 240000 })
    await shot(page, '05-review')
    report.steps.push('review-ready')

    // Collect scannable text from review pane
    const bodyText = await page.locator('body').innerText()
    report.reviewText = bodyText.slice(0, 12000)
    const scoreMatch = bodyText.match(/(\d{1,3})%/)
    report.score = scoreMatch ? Number(scoreMatch[1]) : null

    // Heuristics for professional draft quality
    const lower = bodyText.toLowerCase()
    const checks = {
      hasReviewHeader: /review this version/i.test(bodyText),
      noInventedGreenhills: !/greenhills/i.test(bodyText) || /green.?hills/i.test(bodyText), // preferred only
      mentionsCppOrEmbedded:
        /c\+\+|embedded|rtos|real[- ]time|software engineer/i.test(bodyText),
      noPreDraftQuizBlocking: !/question 1 of 3/i.test(bodyText),
      hasOptionalTipsOrDiff:
        /optional tips|accept|decline|change/i.test(bodyText),
      noGenericSynergy: !/\bsynergy\b|\bresults-driven professional\b/i.test(lower),
    }
    report.checks = checks
    report.ok = checks.hasReviewHeader && checks.noPreDraftQuizBlocking

    writeFileSync(`${OUT}/l3harris-report.json`, JSON.stringify(report, null, 2))
    writeFileSync(`${OUT}/l3harris-review.txt`, report.reviewText)
    console.log('report', JSON.stringify({ ok: report.ok, score: report.score, checks, steps: report.steps, errors: report.errors }, null, 2))

    if (HEADED) {
      console.log('Browser left open 10 min (or Ctrl+C). Inspect the review UI.')
      await page.waitForTimeout(10 * 60 * 1000)
    }
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err))
    await shot(page, 'error').catch(() => {})
    writeFileSync(`${OUT}/l3harris-report.json`, JSON.stringify(report, null, 2))
    console.error('FAILED', err)
    if (HEADED) {
      console.log('Leaving browser open 3 min for inspection…')
      await page.waitForTimeout(180000)
    }
    process.exitCode = 1
  } finally {
    if (!HEADED) await browser.close()
    else await browser.close().catch(() => {})
  }
}

run()
