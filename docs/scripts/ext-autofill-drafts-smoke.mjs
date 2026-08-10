import { chromium } from 'playwright'

const EXT_ID = 'ppjfhfeklglodfcpkkomggdckpdckdao'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]
const job = ctx.pages().find(p => p.url().includes('greenhouse'))
if (!job) throw new Error('no greenhouse tab')

await job.evaluate(() => {
  for (const t of document.querySelectorAll('textarea')) {
    t.value = ''
    t.dispatchEvent(new Event('input', { bubbles: true }))
    t.dispatchEvent(new Event('change', { bubbles: true }))
  }
})

const hiq = ctx.serviceWorkers().find(w => w.url().includes(EXT_ID))
await hiq.evaluate(async () => {
  const tabs = await chrome.tabs.query({ url: '*://job-boards.greenhouse.io/*' })
  const files = chrome.runtime.getManifest().content_scripts?.[0]?.js
  await chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files })
})
await job.waitForTimeout(1200)

await job.evaluate(() => {
  document.getElementById('hireiq-panel-root')?.shadowRoot?.querySelector('#hiq-autofill')?.click()
})

for (let i = 0; i < 40; i++) {
  await job.waitForTimeout(2000)
  const s = await job.evaluate(() => {
    const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
    return {
      status: sr?.querySelector('#hiq-status')?.textContent || '',
      cards: sr?.querySelectorAll('#hiq-review-list > *').length || 0,
      provisional: document.querySelectorAll('[data-hiq-state="provisional"]').length,
    }
  })
  console.log(`t+${(i + 1) * 2}s`, s)
  if (
    (/Autofill done|Drafts failed|Connect|Sign in|Unauthorized|review gray/i.test(s.status) ||
      s.cards > 0 ||
      s.provisional > 0) &&
    i >= 4
  ) {
    break
  }
}

process.exit(0)
