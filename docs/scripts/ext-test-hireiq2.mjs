import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-compare', 'hireiq-test')
mkdirSync(DIR, { recursive: true })

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]

// Reload extension
let ext = ctx.pages().find(p => p.url().includes('chrome://extensions'))
if (!ext) ext = await ctx.newPage()
await ext.goto('chrome://extensions/?id=ppjfhfeklglodfcpkkomggdckpdckdao')
await ext.waitForTimeout(1200)
const reloaded = await ext.evaluate(() => {
  const mgr = document.querySelector('extensions-manager')
  const detail = mgr?.shadowRoot?.querySelector('extensions-detail-view')
  const btn = detail?.shadowRoot?.querySelector('#dev-reload-button')
  if (btn) {
    btn.click()
    return 'reloaded'
  }
  const itemList = mgr?.shadowRoot?.querySelector('extensions-item-list')
  const items = itemList?.shadowRoot ? [...itemList.shadowRoot.querySelectorAll('extensions-item')] : []
  const hire = items.find(el => (el.shadowRoot?.querySelector('#name')?.textContent || '').includes('HireIQ'))
  const rb = hire?.shadowRoot?.querySelector('#dev-reload-button')
  if (rb) {
    rb.click()
    return 'list-reloaded'
  }
  return 'no-btn'
})
console.log('reload', reloaded)
await ext.waitForTimeout(2500)

// Fresh greenhouse tab
const page = await ctx.newPage()
page.on('console', msg => {
  const t = msg.text()
  if (/hireiq|onExecute|content\.ts|Failed to load/i.test(t)) console.log('CONSOLE', msg.type(), t)
})
await page.goto('https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})
await page.waitForTimeout(5000)

let state = await page.evaluate(() => {
  const hireiq = document.getElementById('hireiq-panel-root')
  return {
    hireiq: Boolean(hireiq),
    text: hireiq?.shadowRoot?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 400) || '',
    plasmo: Boolean(document.querySelector('plasmo-csui')),
  }
})
console.log('state', state)
await page.screenshot({ path: join(DIR, '07-after-fix.png'), fullPage: false })

if (!state.hireiq) {
  // Try waiting longer / scroll
  await page.waitForTimeout(3000)
  state = await page.evaluate(() => ({
    hireiq: Boolean(document.getElementById('hireiq-panel-root')),
    text: document.getElementById('hireiq-panel-root')?.shadowRoot?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 400) || '',
  }))
  console.log('state2', state)
}

if (state.hireiq) {
  await page.evaluate(() => {
    const root = document.getElementById('hireiq-panel-root')
    root?.removeAttribute('data-collapsed')
    root?.shadowRoot?.getElementById('hiq-autofill')?.click()
  })
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(1000)
    const status = await page.evaluate(() => {
      const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
      return {
        status: sr?.getElementById('hiq-status')?.textContent || '',
        prog: sr?.getElementById('hiq-prog-label')?.textContent || '',
      }
    })
    console.log('tick', i, status)
  }
  const filled = await page.evaluate(() =>
    [...document.querySelectorAll('input,textarea')]
      .filter(el => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      .filter(el => el.type !== 'hidden' && el.type !== 'file' && (el.value || '').trim())
      .map(el => ({ name: el.name || el.id, value: el.value.slice(0, 50) })),
  )
  console.log('filled', filled)
  await page.screenshot({ path: join(DIR, '08-autofilled.png'), fullPage: false })

  await page.evaluate(() => {
    document.getElementById('hireiq-panel-root')?.shadowRoot?.getElementById('hiq-save')?.click()
  })
  await page.waitForTimeout(3000)
  const save = await page.evaluate(() => {
    const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
    return {
      status: sr?.getElementById('hiq-status')?.textContent || '',
      openHidden: sr?.getElementById('hiq-open')?.hasAttribute('hidden'),
    }
  })
  console.log('save', save)
  await page.screenshot({ path: join(DIR, '09-saved.png'), fullPage: false })
  writeFileSync(join(DIR, 'result2.json'), JSON.stringify({ state, filled, save }, null, 2))
} else {
  writeFileSync(join(DIR, 'result2.json'), JSON.stringify({ state, error: 'panel missing' }, null, 2))
}

process.exit(0)
