import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function env(name) {
  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find(l => l.startsWith(`${name}=`))
  if (!line) return ''
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '')
}

const email = env('TEST_USER_EMAIL')
const password = env('TEST_USER_PASSWORD')
const DIR = join('.ui-audit', 'ext-compare', 'hireiq-test')

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]
const page = await ctx.newPage()
await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(2000)
if (page.url().includes('login')) {
  await page.locator('input[type=email], input[name=email]').first().fill(email)
  await page.locator('input[type=password]').first().fill(password)
  await page.locator('button[type=submit]').first().click()
  await page.waitForTimeout(4000)
}

const res = await page.evaluate(async () => {
  const r = await fetch('/api/extension/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'research2' }),
  })
  return { status: r.status, ...(await r.json()) }
})
console.log('token', res.status, res.token ? 'OK' : res.error)
if (!res.token) process.exit(1)
writeFileSync(join(DIR, 'token.tmp'), res.token)

const pop = await ctx.newPage()
await pop.goto('chrome-extension://ppjfhfeklglodfcpkkomggdckpdckdao/src/popup.html')
await pop.waitForTimeout(700)
const stored = await pop.evaluate(async token => {
  await chrome.storage.sync.set({ apiBaseUrl: 'http://localhost:3000', token })
  return await chrome.storage.sync.get(['apiBaseUrl', 'token'])
}, res.token)
console.log('stored len', stored.token?.length)

const job = await ctx.newPage()
await job.goto('https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})
await job.waitForTimeout(4000)
await job.evaluate(() => {
  const root = document.getElementById('hireiq-panel-root')
  root?.removeAttribute('data-collapsed')
  root?.shadowRoot?.getElementById('hiq-autofill')?.click()
})
for (let i = 1; i <= 8; i++) {
  await job.waitForTimeout(700)
  const s = await job.evaluate(() => {
    const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
    return sr?.getElementById('hiq-status')?.textContent || ''
  })
  console.log('t' + i, s)
  if (s && !/Loading|Filling/i.test(s)) break
}

const filled = await job.evaluate(() =>
  [...document.querySelectorAll('input,textarea')]
    .filter(el => el.type !== 'hidden' && el.type !== 'file' && (el.value || '').trim())
    .map(el => ({ name: el.name || el.id, value: el.value.slice(0, 50) })),
)
console.log('filled', filled.length, filled)
await job.screenshot({ path: join(DIR, '14-ok-autofill.png'), fullPage: false })

await job.evaluate(() => {
  document.getElementById('hireiq-panel-root')?.shadowRoot?.getElementById('hiq-save')?.click()
})
await job.waitForTimeout(4000)
const save = await job.evaluate(() => {
  const sr = document.getElementById('hireiq-panel-root')?.shadowRoot
  return {
    status: sr?.getElementById('hiq-status')?.textContent,
    open: !sr?.getElementById('hiq-open')?.hidden,
    saveText: sr?.getElementById('hiq-save')?.textContent,
  }
})
console.log('save', save)
await job.screenshot({ path: join(DIR, '15-ok-save.png'), fullPage: false })
process.exit(0)
