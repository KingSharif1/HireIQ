import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = '.ui-audit/ext-research'
mkdirSync(OUT, { recursive: true })

const JOBRIGHT =
  'https://chromewebstore.google.com/detail/jobright-autofill-%E2%80%93-insta/odcnpipkhjegpefkfplmedhmkmmhmoko'
const TEAL =
  'https://chromewebstore.google.com/detail/teal-job-search-companion/opafjjlpbiaicbbgifbejoochmmeikep'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const context = browser.contexts()[0]

async function open(url) {
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2000)
  return page
}

async function clickAdd(page, name) {
  await page.bringToFront()
  await page.screenshot({ path: `${OUT}/${name}-before.png`, fullPage: false })
  const btn = page.getByRole('button', { name: /Add to Chrome/i }).first()
  const count = await btn.count()
  console.log(name, 'Add to Chrome count=', count, 'url=', page.url())
  if (!count) {
    // Maybe already installed
    const remove = page.getByRole('button', { name: /Remove from Chrome/i })
    if (await remove.count()) {
      console.log(name, 'ALREADY INSTALLED')
      return 'installed'
    }
    console.log(name, 'no button — dumping text snippet')
    const text = await page.locator('body').innerText()
    console.log(text.slice(0, 400))
    return 'missing'
  }
  await btn.click({ timeout: 10000 })
  console.log(name, 'clicked Add to Chrome')
  console.log(name, '>>> Click “Add extension” in the Chrome popup if it appears <<<')
  // Give user / OS dialog time; try Enter in case dialog is focused
  await page.waitForTimeout(800)
  try {
    await page.keyboard.press('Enter')
  } catch {}
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `${OUT}/${name}-after.png`, fullPage: false })
  return 'clicked'
}

const jr = await open(JOBRIGHT)
await clickAdd(jr, 'jobright')

const teal = await open(TEAL)
await clickAdd(teal, 'teal')

const ext = await context.newPage()
await ext.goto('chrome://extensions')
await ext.waitForTimeout(1500)
await ext.screenshot({ path: `${OUT}/extensions-after.png`, fullPage: true })
console.log('See', OUT)
console.log('If extensions missing: click Add extension on any Chrome dialog, then say ready')
