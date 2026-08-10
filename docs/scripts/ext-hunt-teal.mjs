/**
 * Hunt Teal UI + capture Jobright panel details on existing CDP Chrome.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-compare')
mkdirSync(DIR, { recursive: true })

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]

// Extensions inventory
let ext = ctx.pages().find(p => p.url().startsWith('chrome://extensions'))
if (!ext) ext = await ctx.newPage()
await ext.goto('chrome://extensions', { waitUntil: 'domcontentloaded' })
await ext.waitForTimeout(1000)
const extensions = await ext.evaluate(() => {
  const mgr = document.querySelector('extensions-manager')
  const itemList = mgr?.shadowRoot?.querySelector('extensions-item-list')
  const items = itemList?.shadowRoot
    ? [...itemList.shadowRoot.querySelectorAll('extensions-item')]
    : []
  return items.map(el => ({
    id: el.id,
    name: el.shadowRoot?.querySelector('#name')?.textContent?.trim() || null,
    enabled: el.shadowRoot?.querySelector('#enableToggle')?.checked ?? null,
  }))
})
console.log('EXTS', JSON.stringify(extensions, null, 2))
await ext.screenshot({ path: join(DIR, 'extensions.png'), fullPage: true })

const page =
  ctx.pages().find(p => p.url().includes('aechelon')) ||
  ctx.pages().find(p => p.url().includes('greenhouse')) ||
  ctx.pages()[0]

await page.bringToFront()
await page.goto(page.url(), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
await page.waitForTimeout(3000)

async function hunt(label) {
  const data = await page.evaluate(() => {
    const tealish = []
    const customs = new Set()
    function walk(root, depth) {
      if (!root || depth > 8) return
      const nodes = root.querySelectorAll ? root.querySelectorAll('*') : []
      for (const el of nodes) {
        if (el.tagName && el.tagName.includes('-')) customs.add(el.tagName)
        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
        const blob = `${el.tagName} ${el.id || ''} ${String(el.className || '')} ${text.slice(0, 100)}`.toLowerCase()
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null
        if (
          /teal|duck|bookmark|save to tracker|job search companion/i.test(blob) &&
          r &&
          r.width > 12 &&
          r.height > 12
        ) {
          tealish.push({
            tag: el.tagName,
            id: el.id,
            cls: String(el.className || '').slice(0, 100),
            text: text.slice(0, 140),
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
          })
        }
        if (el.shadowRoot) walk(el.shadowRoot, depth + 1)
      }
    }
    walk(document, 0)

    const jr = document.getElementById('jobright-helper-id')
    const jobright = jr
      ? {
          visible: true,
          text: (jr.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800),
          w: Math.round(jr.getBoundingClientRect().width),
          h: Math.round(jr.getBoundingClientRect().height),
        }
      : { visible: false }

    return {
      customs: [...customs],
      tealish: tealish.slice(0, 40),
      jobright,
      title: document.title,
      url: location.href,
    }
  })
  console.log(`\n=== ${label} ===`)
  console.log('url', data.url)
  console.log('customs', data.customs)
  console.log('jobright', JSON.stringify(data.jobright).slice(0, 600))
  console.log('tealish count', data.tealish.length)
  for (const t of data.tealish.slice(0, 15)) {
    console.log(`  · ${t.tag}#${t.id} ${t.text.slice(0, 90)} @${t.x},${t.y}`)
  }
  return data
}

const before = await hunt('before')
await page.screenshot({ path: join(DIR, 'jobright-ready-aechelon.png'), fullPage: false })

// Try collapse Jobright header control
const collapse = await page.evaluate(() => {
  const root = document.getElementById('jobright-helper-id')
  if (!root) return 'no-jobright'
  const candidates = [...root.querySelectorAll('button, [role="button"]')]
  const hit =
    candidates.find(b =>
      /collapse|close|hide|arrow|chevron/i.test(
        `${b.getAttribute('aria-label') || ''} ${b.className} ${b.innerText || ''}`,
      ),
    ) || candidates[0]
  if (!hit) return 'no-btn'
  hit.click()
  return `clicked:${(hit.getAttribute('aria-label') || hit.className || hit.tagName).slice(0, 80)}`
})
console.log('collapse attempt', collapse)
await page.waitForTimeout(2000)
const after = await hunt('after-collapse')
await page.screenshot({ path: join(DIR, 'after-collapse-jobright.png'), fullPage: false })

writeFileSync(
  join(DIR, 'teal-hunt.json'),
  JSON.stringify({ extensions, before, after, collapse }, null, 2),
)
console.log('wrote teal-hunt.json')
process.exit(0)
