/**
 * Reload HireIQ extension, save Aechelon job, verify payload + tracker.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-compare', 'save-test')
mkdirSync(DIR, { recursive: true })
const EXT_ID = 'ppjfhfeklglodfcpkkomggdckpdckdao'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]

// Reload extension
let ext = ctx.pages().find(p => p.url().includes('chrome://extensions'))
if (!ext) ext = await ctx.newPage()
await ext.goto(`chrome://extensions/?id=${EXT_ID}`)
await ext.waitForTimeout(1000)
await ext.evaluate(() => {
  const mgr = document.querySelector('extensions-manager')
  const detail = mgr?.shadowRoot?.querySelector('extensions-detail-view')
  detail?.shadowRoot?.querySelector('#dev-reload-button')?.click()
})
await ext.waitForTimeout(2000)

const job =
  ctx.pages().find(p => p.url().includes('aechelon')) ||
  (await ctx.newPage())
await job.bringToFront()
await job.goto('https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})
await job.waitForTimeout(4500)

const hasPanel = await job.evaluate(() => Boolean(document.getElementById('hireiq-panel-root')))
console.log('panel', hasPanel)
if (!hasPanel) {
  console.error('HireIQ panel missing — reload extension / sign in')
  process.exit(1)
}

// Wait for preview to load
await job.waitForTimeout(2500)
const preview = await job.evaluate(() => {
  const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
  return {
    preview: sr?.getElementById('hiq-preview')?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 400),
    loading: sr?.getElementById('hiq-preview-loading')?.textContent,
  }
})
console.log('preview', preview)
await job.screenshot({ path: join(DIR, '01-before-save.png'), fullPage: false })

const saveResult = await job.evaluate(async () => {
  const root = document.getElementById('hireiq-panel-root')
  const sr = root?.shadowRoot
  root?.removeAttribute('data-collapsed')
  const btn = sr?.getElementById('hiq-save')
  if (!btn) return { ok: false, error: 'no save btn' }
  btn.click()
  return { ok: true }
})
console.log('save click', saveResult)

let final = null
for (let i = 1; i <= 10; i++) {
  await job.waitForTimeout(800)
  final = await job.evaluate(() => {
    const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
    return {
      status: sr?.getElementById('hiq-status')?.textContent || '',
      saveText: sr?.getElementById('hiq-save')?.textContent || '',
      postSave: sr?.getElementById('hiq-postsave')?.classList.contains('show'),
    }
  })
  console.log('t' + i, final)
  if (final.status.includes('Saved') || /fail|error|Sign in/i.test(final.status)) break
}

await job.screenshot({ path: join(DIR, '02-after-save.png'), fullPage: false })

// Open tracker from panel if saved
if (final?.postSave) {
  const opened = await Promise.all([
    ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null),
    job.evaluate(() => {
      document.getElementById('hireiq-panel-root')?.shadowRoot?.getElementById('hiq-open')?.click()
    }),
  ])
  const trackerPage = opened[0]
  if (trackerPage) {
    await trackerPage.waitForTimeout(3000)
    console.log('tracker', trackerPage.url())
    await trackerPage.screenshot({ path: join(DIR, '03-tracker.png'), fullPage: false })
    const body = await trackerPage.evaluate(() => document.body?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 800))
    console.log('tracker text', body)
  }
}

writeFileSync(join(DIR, 'result.json'), JSON.stringify({ preview, final }, null, 2))
process.exit(final?.status?.includes('Saved') ? 0 : 1)
