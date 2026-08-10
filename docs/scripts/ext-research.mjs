/**
 * One research Chrome for competitor UX compare.
 * Keeps Chrome open until this process is killed.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import http from 'node:http'

const PROFILE = join(process.cwd(), '.playwright-chrome-ext-research')
const PORT = 9222
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const URLS = [
  'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008',
  'https://job-boards.greenhouse.io/libertysoftware/jobs/5255650008',
  'https://www.fidelitytalentsource.com/job-search/181488/java-software-engineer/?job-id=181488',
  'https://hire.auzmor.com/atc/careers/7dc8a0e853654d70842da5158956beb4',
  'https://www.schwabjobs.com/job/southlake/specialist-software-developer/33727/95380599904',
  'https://sefl.wd1.myworkdayjobs.com/en-US/SEFL/details/Quality-Specialist_R2026-21146',
  'chrome://extensions/',
]

mkdirSync(PROFILE, { recursive: true })
if (!existsSync(CHROME)) {
  console.error('Chrome not found at', CHROME)
  process.exit(1)
}

function waitForCdp(port, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, res => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('CDP timeout'))
        else setTimeout(tick, 250)
      })
    }
    tick()
  })
}

console.log('Starting ONE research Chrome…')
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    URLS[0],
  ],
  { stdio: 'ignore', detached: false },
)

chrome.on('exit', code => {
  console.log('Chrome exited', code)
  process.exit(code ?? 0)
})

await waitForCdp(PORT)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
const context = browser.contexts()[0] || (await browser.newContext())

// Open remaining URLs as tabs (first already open)
for (let i = 1; i < URLS.length; i++) {
  const p = await context.newPage()
  await p.goto(URLS[i], { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => {
    console.log('goto fail', URLS[i], e.message.slice(0, 80))
  })
}

console.log('')
console.log('Browser ready — live jobs only (dead ones removed).')
console.log('Leave this running. Reply in Cursor when Teal/Jobright panels are open.')
console.log('')

process.on('SIGINT', () => {
  chrome.kill()
  process.exit(0)
})

await new Promise(() => {})
