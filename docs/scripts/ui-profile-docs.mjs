/**
 * Focused Playwright smoke for Profile export dialog + Projects GitHub hub.
 * Usage: node docs/scripts/ui-profile-docs.mjs [--headed]
 */
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

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
const OUT = '.ui-audit'
const HEADED = process.argv.includes('--headed') || process.env.PW_HEADED === '1'

if (!EMAIL || !PASSWORD) {
  console.error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD in .env.local')
  process.exit(3)
}

mkdirSync(OUT, { recursive: true })

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByPlaceholder('Email address').waitFor({ timeout: 30000 })
  await page.getByPlaceholder('Email address').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 25000 })
}

async function run() {
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 120 : 0 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  const notes = []

  try {
    await login(page)

    await page.goto(`${BASE}/dashboard/profile?section=resumes`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(OUT, 'profile-resumes.png'), fullPage: true })

    const exportBtn = page.getByRole('button', { name: 'Export PDF' }).first()
    await exportBtn.click()
    await page.getByRole('dialog', { name: /Export master resume/i }).waitFor({ timeout: 8000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(OUT, 'profile-export-dialog.png') })

    const zoomIn = page.getByRole('button', { name: 'Zoom in' })
    const hasZoom = (await zoomIn.count()) > 0
    notes.push(`export-zoom-controls: ${hasZoom ? 'pass' : 'fail'}`)
    if (hasZoom) {
      await zoomIn.click()
      await zoomIn.click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: join(OUT, 'profile-export-zoomed.png') })
    }

    const dialogBox = await page.getByRole('dialog').boundingBox()
    notes.push(
      `export-dialog-size: ${dialogBox ? `${Math.round(dialogBox.width)}x${Math.round(dialogBox.height)}` : 'missing'}`
    )
    if (dialogBox && dialogBox.width >= 1100 && dialogBox.height >= 700) {
      notes.push('export-dialog-large: pass')
    } else {
      notes.push('export-dialog-large: fail')
    }

    await page.keyboard.press('Escape')

    await page.goto(`${BASE}/dashboard/profile?section=projects`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: join(OUT, 'profile-projects-github.png'), fullPage: true })

    const githubHeading = page.getByRole('heading', { name: 'GitHub', exact: true })
    notes.push(`github-panel: ${(await githubHeading.count()) > 0 ? 'pass' : 'fail'}`)

    const addFromGithub = page.getByRole('button', { name: 'Add from GitHub' })
    const separateAddCard = page.getByText('Pick a repo and we’ll fill name, stack')
    notes.push(`combined-github-ui: ${(await addFromGithub.count()) > 0 && (await separateAddCard.count()) === 0 ? 'pass' : 'fail'}`)

    const badJson = page.getByText('Unexpected token')
    notes.push(`github-json-error: ${(await badJson.count()) === 0 ? 'pass' : 'fail'}`)

    writeFileSync(join(OUT, 'profile-docs-notes.txt'), notes.join('\n') + '\n')
    console.log(notes.join('\n'))
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
