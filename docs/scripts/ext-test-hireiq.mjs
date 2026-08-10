/**
 * Test HireIQ panel on Greenhouse next to Jobright.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-compare', 'hireiq-test')
mkdirSync(DIR, { recursive: true })

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]

const page =
  ctx.pages().find(p => p.url().includes('aechelon')) ||
  ctx.pages().find(p => p.url().includes('libertysoftware'))

if (!page) {
  console.error('No greenhouse job tab')
  process.exit(1)
}

await page.bringToFront()
console.log('URL', page.url())
await page.goto(page.url(), { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(4500)
await page.screenshot({ path: join(DIR, '01-after-refresh.png'), fullPage: false })

async function probe() {
  return page.evaluate(() => {
    const hireiq = document.getElementById('hireiq-panel-root')
    const jr = document.getElementById('jobright-helper-id')
    let hireiqText = ''
    let hireiqCollapsed = false
    if (hireiq?.shadowRoot) {
      hireiqCollapsed = hireiq.getAttribute('data-collapsed') === '1'
      hireiqText = (hireiq.shadowRoot.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500)
    }
    return {
      hireiq: Boolean(hireiq),
      hireiqCollapsed,
      hireiqText,
      jobright: Boolean(jr),
      jobrightText: jr ? (jr.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200) : '',
      customs: [...new Set([...document.querySelectorAll('*')].map(e => e.tagName).filter(t => t.includes('-')))],
    }
  })
}

let state = await probe()
console.log('probe1', JSON.stringify(state, null, 2))

// Expand if collapsed
if (state.hireiq && state.hireiqCollapsed) {
  await page.evaluate(() => {
    const root = document.getElementById('hireiq-panel-root')
    const btn = root?.shadowRoot?.getElementById('hiq-expand')
    btn?.click()
  })
  await page.waitForTimeout(500)
  state = await probe()
  console.log('expanded', state.hireiqCollapsed, state.hireiqText.slice(0, 200))
}

await page.screenshot({ path: join(DIR, '02-panel-visible.png'), fullPage: false })

// Form before
const before = await page.evaluate(() => {
  return [...document.querySelectorAll('input,textarea,select')]
    .filter(el => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    .filter(el => el.type !== 'hidden' && el.type !== 'file')
    .map(el => ({ name: el.name || el.id, value: (el.value || '').slice(0, 40), filled: Boolean((el.value || '').trim()) }))
    .slice(0, 25)
})
console.log(
  'before filled',
  before.filter(f => f.filled).length,
  '/',
  before.length,
)

// Click HireIQ Autofill inside shadow
const click = await page.evaluate(() => {
  const root = document.getElementById('hireiq-panel-root')
  if (!root?.shadowRoot) return { ok: false, reason: 'no hireiq root' }
  root.removeAttribute('data-collapsed')
  const btn = root.shadowRoot.getElementById('hiq-autofill')
  if (!btn) return { ok: false, reason: 'no autofill btn' }
  btn.click()
  return { ok: true }
})
console.log('click autofill', click)

for (let i = 1; i <= 5; i++) {
  await page.waitForTimeout(1200)
  const status = await page.evaluate(() => {
    const root = document.getElementById('hireiq-panel-root')
    const sr = root?.shadowRoot
    return {
      status: sr?.getElementById('hiq-status')?.textContent || '',
      prog: sr?.getElementById('hiq-prog-label')?.textContent || '',
      pct: sr?.getElementById('hiq-prog-pct')?.textContent || '',
    }
  })
  console.log(`tick${i}`, status)
  if (i === 2 || i === 5) {
    await page.screenshot({ path: join(DIR, `03-autofill-${i}.png`), fullPage: false })
  }
}

const after = await page.evaluate(() => {
  return [...document.querySelectorAll('input,textarea,select')]
    .filter(el => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    .filter(el => el.type !== 'hidden' && el.type !== 'file')
    .map(el => ({
      name: el.name || el.id,
      label: (el.labels && el.labels[0] && el.labels[0].innerText) || '',
      value: (el.value || '').slice(0, 60),
      filled: Boolean((el.value || '').trim()),
    }))
})

const filled = after.filter(f => f.filled)
console.log('after filled', filled.length, '/', after.length)
console.log(JSON.stringify(filled, null, 2))

// Try Save to HireIQ
const saveClick = await page.evaluate(() => {
  const root = document.getElementById('hireiq-panel-root')
  const btn = root?.shadowRoot?.getElementById('hiq-save')
  if (!btn) return { ok: false }
  btn.click()
  return { ok: true }
})
console.log('save click', saveClick)
await page.waitForTimeout(3000)
const saveStatus = await page.evaluate(() => {
  const root = document.getElementById('hireiq-panel-root')
  const sr = root?.shadowRoot
  return {
    status: sr?.getElementById('hiq-status')?.textContent || '',
    openHidden: sr?.getElementById('hiq-open')?.hasAttribute('hidden'),
    saveText: sr?.getElementById('hiq-save')?.textContent || '',
  }
})
console.log('save status', saveStatus)
await page.screenshot({ path: join(DIR, '04-after-save.png'), fullPage: false })

writeFileSync(
  join(DIR, 'result.json'),
  JSON.stringify({ state, before, after: filled, saveStatus, click }, null, 2),
)
console.log('done', DIR)
process.exit(0)
