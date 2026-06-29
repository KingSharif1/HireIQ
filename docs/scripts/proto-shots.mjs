import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const FILE = pathToFileURL(resolve('docs/prototype/hireiq-redesign.html')).href
const OUT = '.ui-audit'
const HEADED = process.argv.includes('--headed')
mkdirSync(OUT, { recursive: true })

const VIEWS = ['apps', 'tailor', 'profile', 'hub', 'alerts']

const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 300 : 0 })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(FILE, { waitUntil: 'load' })
await page.waitForTimeout(300)

for (const theme of ['dark', 'light']) {
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)
  for (const view of VIEWS) {
    await page.evaluate(v => window.show(v), view)
    await page.waitForTimeout(350)
    await page.screenshot({ path: `${OUT}/proto-${view}-${theme}.png`, fullPage: true })
    console.log(`shot: proto-${view}-${theme}`)
  }
}
await browser.close()
console.log('DONE')
