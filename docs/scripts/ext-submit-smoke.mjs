/**
 * Detect HireIQ submit CTA + page Submit button. Does NOT click submit.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-submit-smoke')
mkdirSync(DIR, { recursive: true })
const EXT_ID = 'ppjfhfeklglodfcpkkomggdckpdckdao'
const JOB = 'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]

let ext = ctx.pages().find(p => p.url().startsWith('chrome://extensions'))
if (!ext) ext = await ctx.newPage()
await ext.goto(`chrome://extensions/?id=${EXT_ID}`)
await ext.waitForTimeout(800)
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
await job.waitForTimeout(2000)

const hiq = ctx.serviceWorkers().find(w => w.url().includes(EXT_ID))
await hiq.evaluate(async () => {
  const tabs = await chrome.tabs.query({ url: '*://job-boards.greenhouse.io/*' })
  const files = chrome.runtime.getManifest().content_scripts?.[0]?.js
  await chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files })
})
await job.waitForTimeout(1500)

const snap = await job.evaluate(() => {
  const root = document.getElementById('hireiq-panel-root')
  const sr = root?.shadowRoot
  const submitBtn = sr?.querySelector('#hiq-submit')
  const labels = [...document.querySelectorAll('button, input[type=submit], input[type=button]')]
    .map(el => {
      const t =
        (el instanceof HTMLInputElement ? el.value : '') ||
        el.getAttribute('aria-label') ||
        (el.textContent || '').replace(/\s+/g, ' ').trim()
      return t.slice(0, 80)
    })
    .filter(Boolean)
    .slice(0, 20)
  return {
    panel: Boolean(root),
    submitText: submitBtn?.textContent?.trim() || null,
    submitDisabled: submitBtn ? (submitBtn).disabled : null,
    hint: sr?.querySelector('#hiq-submit-hint')?.textContent?.trim()?.slice(0, 160) || null,
    pageLabels: labels,
  }
})

console.log(JSON.stringify(snap, null, 2))
await job.screenshot({ path: join(DIR, 'submit-panel.png') })
process.exit(snap.panel ? 0 : 1)
