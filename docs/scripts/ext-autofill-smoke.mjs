/**
 * Reload HireIQ, ensure content inject via SW, click #hiq-autofill, capture status.
 * Does NOT close Chrome. Targets #hireiq-panel-root only (not Jobright).
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-autofill-smoke')
mkdirSync(DIR, { recursive: true })
const EXT_ID = 'ppjfhfeklglodfcpkkomggdckpdckdao'
const JOB = 'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]

let ext = ctx.pages().find(p => p.url().startsWith('chrome://extensions'))
if (!ext) ext = await ctx.newPage()
await ext.goto(`chrome://extensions/?id=${EXT_ID}`)
await ext.waitForTimeout(1000)
await ext.evaluate(() => {
  const mgr = document.querySelector('extensions-manager')
  const detail = mgr?.shadowRoot?.querySelector('extensions-detail-view')
  detail?.shadowRoot?.querySelector('#dev-reload-button')?.click()
})
await ext.waitForTimeout(2000)

let job = ctx.pages().find(p => p.url().includes('greenhouse'))
if (!job) job = await ctx.newPage()
await job.bringToFront()
await job.goto(JOB, { waitUntil: 'domcontentloaded', timeout: 60000 })
await job.waitForTimeout(2500)

async function ensurePanel() {
  const hiq = ctx.serviceWorkers().find(w => w.url().includes(EXT_ID))
  if (!hiq) return { err: 'no sw' }
  return hiq.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: '*://job-boards.greenhouse.io/*' })
    const tab = tabs[0]
    if (!tab?.id) return { err: 'no tab' }
    const files = chrome.runtime.getManifest().content_scripts?.[0]?.js
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files })
    return { ok: true }
  })
}

console.log('inject', await ensurePanel())
await job.waitForTimeout(1500)

const before = await job.evaluate(() => {
  const root = document.getElementById('hireiq-panel-root')
  return {
    root: Boolean(root),
    status: root?.shadowRoot?.querySelector('#hiq-status')?.textContent || '',
  }
})
console.log('before', before)
if (!before.root) {
  console.error('HireIQ panel missing')
  process.exit(1)
}

await job.screenshot({ path: join(DIR, '04-hireiq-panel.png') })

await job.evaluate(() => {
  document
    .getElementById('hireiq-panel-root')
    ?.shadowRoot?.querySelector('#hiq-autofill')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})

for (let i = 0; i < 45; i++) {
  await job.waitForTimeout(2000)
  const s = await job.evaluate(() => {
    const root = document.getElementById('hireiq-panel-root')
    const sr = root?.shadowRoot
    return {
      status: sr?.querySelector('#hiq-status')?.textContent || '',
      cards: sr?.querySelectorAll('#hiq-review-list > *').length || 0,
      reviewShow: sr?.querySelector('#hiq-review')?.classList?.contains('show') || false,
      provisional: document.querySelectorAll('[data-hiq-state="provisional"]').length,
      flash: document.querySelectorAll('.hiq-flash-green, [data-hiq-state="accepted"]').length,
    }
  })
  console.log(`t+${(i + 1) * 2}s`, s)
  if (/Autofill done|review gray|to review|Attached|Drafts failed|Connect HireIQ|Sign in/i.test(s.status)) {
    if (i >= 2) break
  }
}

await job.screenshot({ path: join(DIR, '05-after-autofill.png') })
console.log('shots', DIR)
process.exit(0)
