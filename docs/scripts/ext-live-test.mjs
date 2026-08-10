/**
 * Live-test Teal tracker + Jobright autofill on existing CDP Chrome.
 * Screenshots + structured notes. Does not close Chrome.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-compare', 'live-test')
mkdirSync(DIR, { recursive: true })

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]
const notes = { steps: [], teal: null, jobright: null }

function log(step, data) {
  console.log('\n##', step)
  if (data) console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2).slice(0, 2000))
  notes.steps.push({ step, data, at: new Date().toISOString() })
}

async function shot(page, name) {
  const path = join(DIR, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  log('screenshot', path)
  return path
}

async function readPanelText(page) {
  return page.evaluate(() => {
    function walk(root, depth, out) {
      if (!root || depth > 8) return out
      for (const el of root.querySelectorAll ? root.querySelectorAll('*') : []) {
        const id = el.id || ''
        const cls = String(el.className || '')
        const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
        if (
          /jobright-helper|plasmo|teal|autofill|match|generate custom|save job|bookmarked/i.test(
            `${id} ${cls} ${text.slice(0, 40)}`,
          ) &&
          text.length > 20
        ) {
          const r = el.getBoundingClientRect()
          if (r.width > 80 && r.height > 40) {
            out.push({
              id,
              cls: cls.slice(0, 80),
              text: text.slice(0, 600),
              w: Math.round(r.width),
              h: Math.round(r.height),
            })
          }
        }
        if (el.shadowRoot) walk(el.shadowRoot, depth + 1, out)
      }
      return out
    }
    return walk(document, 0, []).slice(0, 20)
  })
}

async function formSnapshot(page) {
  return page.evaluate(() => {
    const fields = [...document.querySelectorAll('input, textarea, select')]
      .filter(el => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && el.type !== 'hidden'
      })
      .slice(0, 40)
      .map(el => ({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || el.id || '',
        label:
          (el.labels && el.labels[0] && el.labels[0].innerText) ||
          el.getAttribute('aria-label') ||
          el.placeholder ||
          '',
        value: (el.value || '').slice(0, 80),
        filled: Boolean((el.value || '').trim()),
      }))
    return {
      total: fields.length,
      filled: fields.filter(f => f.filled).length,
      fields,
    }
  })
}

// ---------- TEAL TRACKER ----------
const tealPage = ctx.pages().find(p => /tealhq\.com/i.test(p.url()))
if (tealPage) {
  await tealPage.bringToFront()
  await tealPage.waitForTimeout(1500)
  await tealPage.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await tealPage.waitForTimeout(2500)
  await shot(tealPage, '01-teal-tracker')

  const tealUi = await tealPage.evaluate(() => {
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 2500)
    const headings = [...document.querySelectorAll('h1,h2,h3,[role=heading]')]
      .map(h => h.innerText?.trim())
      .filter(Boolean)
      .slice(0, 30)
    const buttons = [...document.querySelectorAll('button, a')]
      .map(b => (b.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(t => t && t.length < 60)
      .slice(0, 40)
    return { url: location.href, title: document.title, headings, buttons, text }
  })
  notes.teal = tealUi
  log('teal-tracker', {
    url: tealUi.url,
    title: tealUi.title,
    headings: tealUi.headings,
    buttons: tealUi.buttons,
  })
} else {
  log('teal-tracker', 'NO TEAL TAB')
}

// ---------- JOBRIGHT on Aechelon Greenhouse ----------
const jobPage =
  ctx.pages().find(p => p.url().includes('aechelon')) ||
  ctx.pages().find(p => p.url().includes('libertysoftware')) ||
  ctx.pages().find(p => /greenhouse/i.test(p.url()))

if (!jobPage) {
  log('jobright', 'NO JOB PAGE')
  writeFileSync(join(DIR, 'notes.json'), JSON.stringify(notes, null, 2))
  process.exit(1)
}

await jobPage.bringToFront()
await jobPage.goto(jobPage.url(), { waitUntil: 'domcontentloaded', timeout: 60000 })
await jobPage.waitForTimeout(4000)
await shot(jobPage, '02-job-before-autofill')

const beforeForm = await formSnapshot(jobPage)
const panelsBefore = await readPanelText(jobPage)
log('before-form', { filled: beforeForm.filled, total: beforeForm.total, sample: beforeForm.fields.slice(0, 12) })
log('panels-before', panelsBefore.map(p => p.text.slice(0, 200)))

// Click Autofill inside Jobright panel (shadow-aware click via coordinates if needed)
const clickResult = await jobPage.evaluate(() => {
  function findAutofillButton(root, depth = 0) {
    if (!root || depth > 8) return null
    const nodes = root.querySelectorAll ? [...root.querySelectorAll('button, [role=button], div, span')] : []
    for (const el of nodes) {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim()
      if (/^autofill$/i.test(t) || t === 'Autofill') {
        const r = el.getBoundingClientRect()
        if (r.width > 60 && r.height > 24) return { el, r, t }
      }
      if (el.shadowRoot) {
        const hit = findAutofillButton(el.shadowRoot, depth + 1)
        if (hit) return hit
      }
    }
    // also recurse shadow hosts
    for (const el of nodes) {
      if (el.shadowRoot) {
        const hit = findAutofillButton(el.shadowRoot, depth + 1)
        if (hit) return hit
      }
    }
    return null
  }

  // Prefer #jobright-helper-id then plasmo hosts
  const hosts = [
    document.getElementById('jobright-helper-id'),
    ...document.querySelectorAll('plasmo-csui, #jobright-helper-plugin'),
  ].filter(Boolean)

  let hit = null
  for (const host of hosts) {
    hit = findAutofillButton(host.shadowRoot || host)
    if (hit) break
  }
  if (!hit) hit = findAutofillButton(document)

  if (!hit) return { ok: false, reason: 'no Autofill button' }
  const { el, r, t } = hit
  el.click()
  return {
    ok: true,
    text: t,
    x: Math.round(r.x + r.width / 2),
    y: Math.round(r.y + r.height / 2),
    w: Math.round(r.width),
    h: Math.round(r.height),
  }
})

log('click-autofill', clickResult)

// If evaluate click failed, try Playwright locator
if (!clickResult.ok) {
  const btn = jobPage.getByRole('button', { name: /^Autofill$/i }).first()
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click()
    log('click-autofill-playwright', 'clicked via getByRole')
  } else {
    // click by text anywhere
    const any = jobPage.locator('text=Autofill').first()
    if (await any.isVisible({ timeout: 2000 }).catch(() => false)) {
      await any.click()
      log('click-autofill-text', 'clicked text=Autofill')
    }
  }
}

// Observe filling over a few seconds
for (let i = 1; i <= 6; i++) {
  await jobPage.waitForTimeout(1500)
  const snap = await formSnapshot(jobPage)
  log(`fill-tick-${i}`, { filled: snap.filled, total: snap.total })
  if (i === 2 || i === 5) await shot(jobPage, `03-job-autofilling-${i}`)
}

const afterForm = await formSnapshot(jobPage)
const panelsAfter = await readPanelText(jobPage)
await shot(jobPage, '04-job-after-autofill')

notes.jobright = {
  url: jobPage.url(),
  clickResult,
  before: beforeForm,
  after: afterForm,
  changedFields: afterForm.fields.filter((f, idx) => {
    const b = beforeForm.fields[idx]
    return b && b.value !== f.value && f.filled
  }),
  newlyFilled: afterForm.fields.filter(f => f.filled && !beforeForm.fields.find(b => b.name === f.name && b.filled)),
  panelsAfter: panelsAfter.map(p => p.text.slice(0, 300)),
}

log('after-form', {
  filled: afterForm.filled,
  total: afterForm.total,
  filledFields: afterForm.fields.filter(f => f.filled).slice(0, 20),
})

writeFileSync(join(DIR, 'notes.json'), JSON.stringify(notes, null, 2))
console.log('\nWrote', join(DIR, 'notes.json'))
process.exit(0)
