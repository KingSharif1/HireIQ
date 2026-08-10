/**
 * Inspect competitor extension UI on existing CDP Chrome.
 * Soft-refreshes each job tab (goto same URL), screenshots, probes shadow DOM.
 * Disconnects without asking Chrome to quit (does not kill parent launcher).
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CDP = 'http://127.0.0.1:9222'
const DIR = join(process.cwd(), '.ui-audit', 'ext-compare')
mkdirSync(DIR, { recursive: true })

function isJobPage(title, url) {
  if (/chromewebstore\.google\.com/i.test(url)) return false
  if (/^chrome:\/\//i.test(url)) return false
  return /job|career|greenhouse|workday|auzmor|oorwin|schwab|fidelity|hire\.|myworkday/i.test(
    `${url} ${title}`,
  )
}

function safeName(i, title) {
  const slug = String(title || 'page')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .toLowerCase()
  return `${String(i).padStart(2, '0')}-${slug || 'page'}`
}

async function probeExtensions(page) {
  return page.evaluate(() => {
    function walkShadow(root, depth = 0, out = []) {
      if (!root || depth > 6) return out
      const nodes = root.querySelectorAll ? root.querySelectorAll('*') : []
      for (const el of nodes) {
        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
        const id = el.id || ''
        const cls = String(el.className || '')
        const tag = el.tagName
        const blob = `${tag} ${id} ${cls} ${text}`.toLowerCase()
        if (
          /teal|jobright|hireiq|autofill|save job|save to|bookmarked|start applying|match score|tracker/i.test(
            blob,
          )
        ) {
          const r = el.getBoundingClientRect?.() || { x: 0, y: 0, width: 0, height: 0 }
          if (r.width >= 40 && r.height >= 20) {
            out.push({
              depth,
              tag,
              id,
              cls: cls.slice(0, 100),
              text: text.slice(0, 160),
              x: Math.round(r.x),
              y: Math.round(r.y),
              w: Math.round(r.width),
              h: Math.round(r.height),
            })
          }
        }
        if (el.shadowRoot) walkShadow(el.shadowRoot, depth + 1, out)
      }
      return out
    }

    const hosts = [...document.querySelectorAll('*')]
      .filter(e => e.shadowRoot || /PLASMO|TEAL|JOBRIGHT|HIREIQ/i.test(e.tagName))
      .slice(0, 50)
      .map(e => ({ tag: e.tagName, id: e.id, cls: String(e.className || '').slice(0, 80) }))

    const matches = walkShadow(document).slice(0, 40)
    return { hosts, matches }
  })
}

const browser = await chromium.connectOverCDP(CDP)
const context = browser.contexts()[0]
if (!context) {
  console.error('No context')
  process.exit(1)
}

const pages = context.pages()
console.log('tabs:', pages.length)
const report = { jobs: [] }

for (let i = 0; i < pages.length; i++) {
  const page = pages[i]
  let title = ''
  let url = ''
  try {
    title = await page.title()
    url = page.url()
  } catch {
    continue
  }

  console.log(`[${i}] ${title.slice(0, 70)}`)
  console.log('    ', url.slice(0, 130))

  if (/^chrome:\/\/extensions/i.test(url)) {
    await page.bringToFront()
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(1500)
    const shot = join(DIR, 'extensions.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    const names = await page.evaluate(() => {
      const items = [...document.querySelectorAll('extensions-item')]
      return items.map(el => ({
        id: el.getAttribute('id'),
        name: el.shadowRoot?.querySelector('#name')?.textContent?.trim() || null,
      }))
    }).catch(() => [])
    console.log('  extensions:', JSON.stringify(names))
    report.extensions = names
    report.extensionsShot = shot
    continue
  }

  if (!isJobPage(title, url)) continue

  const entry = { i, title, url, shot: null, ui: null, error: null }
  try {
    await page.bringToFront()
    console.log('  REFRESH')
    // Soft refresh: navigate to same URL (better for SPAs than reload)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3500)

    // Dismiss common cookie overlays if present (don't fail if not)
    for (const sel of [
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      'button:has-text("I Agree")',
      '[aria-label="Close"]',
    ]) {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click({ timeout: 1000 }).catch(() => {})
      }
    }
    await page.waitForTimeout(800)

    const shot = join(DIR, `job-${safeName(i, title)}.png`)
    await page.screenshot({ path: shot, fullPage: false })
    entry.shot = shot
    entry.ui = await probeExtensions(page)
    console.log(
      `  hosts=${entry.ui.hosts.length} matches=${entry.ui.matches.length} shot=${shot}`,
    )
    for (const m of entry.ui.matches.slice(0, 10)) {
      console.log(`    · [${m.tag}#${m.id}] ${m.text.slice(0, 90)}`)
    }
  } catch (e) {
    entry.error = e.message.slice(0, 200)
    console.log('  fail', entry.error)
  }
  report.jobs.push(entry)
}

writeFileSync(join(DIR, 'report.json'), JSON.stringify(report, null, 2))
console.log('wrote', join(DIR, 'report.json'))

// Important: only disconnect CDP client — do not kill Chrome.
// Playwright close() on CDP can tear down the browser depending on version;
// leave connection to GC by exiting process without close when possible.
try {
  browser.removeAllListeners?.()
} catch {}
console.log('DONE — Chrome should still be open')
process.exit(0)
