import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-compare', 'hireiq-test')
mkdirSync(DIR, { recursive: true })

function env(name) {
  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find(l => l.startsWith(`${name}=`))
  if (!line) return ''
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '')
}

const email = env('TEST_USER_EMAIL')
const password = env('TEST_USER_PASSWORD')
if (!email || !password) {
  console.error('Missing TEST_USER_EMAIL / TEST_USER_PASSWORD')
  process.exit(1)
}

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]
const page = await ctx.newPage()
await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(1200)

const emailSel = page.locator('input[type=email], input[name=email]').first()
const passSel = page.locator('input[type=password]').first()
await emailSel.fill(email)
await passSel.fill(password)
await page.locator('button[type=submit]').first().click()
await page.waitForTimeout(5000)
console.log('url', page.url())

const res = await page.evaluate(async () => {
  const r = await fetch('/api/extension/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'research-chrome' }),
  })
  const j = await r.json().catch(() => ({}))
  return { status: r.status, token: j.token || null, error: j.error || null }
})
console.log('token api', res.status, res.token ? 'TOKEN_OK' : res.error)

if (!res.token) process.exit(1)

writeFileSync(join(DIR, 'token.tmp'), res.token)

const pop = await ctx.newPage()
await pop.goto('chrome-extension://ppjfhfeklglodfcpkkomggdckpdckdao/src/popup.html')
await pop.waitForTimeout(800)
await pop.evaluate(async token => {
  await chrome.storage.sync.set({ apiBaseUrl: 'http://localhost:3000', token })
}, res.token)
console.log('extension storage set')

// Retest on greenhouse
const job =
  ctx.pages().find(p => p.url().includes('aechelon')) ||
  (await ctx.newPage())
await job.bringToFront()
await job.goto('https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})
await job.waitForTimeout(4500)

const has = await job.evaluate(() => Boolean(document.getElementById('hireiq-panel-root')))
console.log('panel', has)
if (!has) {
  console.error('panel missing after token set')
  process.exit(1)
}

await job.evaluate(() => {
  const root = document.getElementById('hireiq-panel-root')
  root?.removeAttribute('data-collapsed')
  root?.shadowRoot?.getElementById('hiq-autofill')?.click()
})

for (let i = 1; i <= 6; i++) {
  await job.waitForTimeout(1000)
  const status = await job.evaluate(() => {
    const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
    return {
      status: sr?.getElementById('hiq-status')?.textContent || '',
      prog: sr?.getElementById('hiq-prog-label')?.textContent || '',
      pct: sr?.getElementById('hiq-prog-pct')?.textContent || '',
    }
  })
  console.log('tick', i, status)
}
await job.screenshot({ path: join(DIR, '10-autofill-with-token.png'), fullPage: false })

const filled = await job.evaluate(() =>
  [...document.querySelectorAll('input,textarea')]
    .filter(el => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    .filter(el => el.type !== 'hidden' && el.type !== 'file' && (el.value || '').trim())
    .map(el => ({
      name: el.name || el.id,
      label: (el.labels && el.labels[0] && el.labels[0].innerText) || '',
      value: el.value.slice(0, 60),
    })),
)
console.log('filled count', filled.length)
console.log(JSON.stringify(filled, null, 2))

await job.evaluate(() => {
  document.getElementById('hireiq-panel-root')?.shadowRoot?.getElementById('hiq-save')?.click()
})
await job.waitForTimeout(3500)
const save = await job.evaluate(() => {
  const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
  return {
    status: sr?.getElementById('hiq-status')?.textContent || '',
    openHidden: sr?.getElementById('hiq-open')?.hasAttribute('hidden'),
    saveText: sr?.getElementById('hiq-save')?.textContent || '',
  }
})
console.log('save', save)
await job.screenshot({ path: join(DIR, '11-after-save.png'), fullPage: false })

writeFileSync(join(DIR, 'final.json'), JSON.stringify({ filled, save }, null, 2))
process.exit(0)
