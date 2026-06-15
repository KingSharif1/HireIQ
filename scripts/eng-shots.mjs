import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const FILE = pathToFileURL(resolve('prototype/hireiq-engineering.html')).href
const OUT = '.ui-audit'
const HEADED = process.argv.includes('--headed')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 250 : 0 })
const page = await browser.newPage({ viewport: { width: 1280, height: 980 }, deviceScaleFactor: 2 })
await page.goto(FILE, { waitUntil: 'load' })
await page.waitForTimeout(700) // webfonts

// All four accents in dark (the primary theme)
for (const acc of ['lime', 'blue', 'amber', 'orange']) {
  await page.evaluate(a => (document.documentElement.dataset.accent = a), acc)
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/eng2-dark-${acc}.png`, fullPage: true })
  console.log(`shot: eng2-dark-${acc}`)
}

// Light theme — show with lime + blue so light legibility is visible
for (const acc of ['lime', 'blue']) {
  await page.evaluate(a => (document.documentElement.dataset.accent = a), acc)
  await page.evaluate(() => (document.documentElement.dataset.theme = 'light'))
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/eng2-light-${acc}.png`, fullPage: true })
  console.log(`shot: eng2-light-${acc}`)
}

await browser.close()
console.log('DONE')
