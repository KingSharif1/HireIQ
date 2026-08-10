import { chromium } from 'playwright'
import { join } from 'node:path'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]
let ext = ctx.pages().find(p => p.url().includes('chrome://extensions'))
if (!ext) ext = await ctx.newPage()
await ext.goto('chrome://extensions/?id=ppjfhfeklglodfcpkkomggdckpdckdao')
await ext.waitForTimeout(1500)

const result = await ext.evaluate(() => {
  const mgr = document.querySelector('extensions-manager')
  const detail = mgr?.shadowRoot?.querySelector('extensions-detail-view')
  const sr = detail?.shadowRoot
  if (!sr) return { ok: false, reason: 'no detail' }

  const selects = [...sr.querySelectorAll('select')].map(s => ({
    id: s.id,
    aria: s.getAttribute('aria-label'),
    value: s.value,
    options: [...s.options].map(o => ({ value: o.value, text: o.textContent?.trim() })),
  }))

  const buttons = [...sr.querySelectorAll('button, cr-button, a')]
    .map(b => (b.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 40)

  // site access is often a select#siteAccess or similar in newer chrome
  const hostSelect =
    sr.querySelector('#hostAccess') ||
    sr.querySelector('select') ||
    null

  let set = null
  if (hostSelect && 'options' in hostSelect) {
    const sel = hostSelect
    const opt =
      [...sel.options].find(o => /all_urls|on_all|all sites/i.test(o.value + o.textContent)) ||
      [...sel.options].find(o => o.value === 'on_all_sites')
    if (opt) {
      sel.value = opt.value
      sel.dispatchEvent(new Event('change', { bubbles: true }))
      set = opt.value
    }
  }

  return { selects, buttons, set, hasHostAccess: Boolean(sr.querySelector('#hostAccess')) }
})

console.log(JSON.stringify(result, null, 2))

// Also try clicking through permissions card
await ext.screenshot({
  path: join('.ui-audit', 'ext-compare', 'hireiq-test', '06-ext-detail.png'),
  fullPage: true,
})

process.exit(0)
