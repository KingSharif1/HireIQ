/**
 * Close non-essential research tabs; keep one job + dashboard + extensions.
 */
import { chromium } from 'playwright'

const KEEP = (url, title) => {
  if (/^chrome:\/\/extensions/i.test(url)) return true
  if (/localhost:3000\/dashboard/i.test(url) && !/tracker|login/i.test(url)) return 'dashboard'
  if (/aechelontechnology\/jobs/i.test(url)) return 'aechelon'
  return false
}

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = browser.contexts()[0]
const pages = ctx.pages()

const kept = { dashboard: null, aechelon: null, extensions: null }
const closed = []

for (const p of [...pages]) {
  let url = ''
  let title = ''
  try {
    url = p.url()
    title = await p.title()
  } catch {
    continue
  }

  const kind = KEEP(url, title)
  if (kind === true) {
    if (!kept.extensions) kept.extensions = p
    else {
      closed.push(title.slice(0, 50))
      await p.close().catch(() => {})
    }
    continue
  }
  if (kind === 'dashboard') {
    if (!kept.dashboard) kept.dashboard = p
    else {
      closed.push(title.slice(0, 50))
      await p.close().catch(() => {})
    }
    continue
  }
  if (kind === 'aechelon') {
    if (!kept.aechelon) kept.aechelon = p
    else {
      closed.push(title.slice(0, 50))
      await p.close().catch(() => {})
    }
    continue
  }

  closed.push(`${title.slice(0, 40)} | ${url.slice(0, 60)}`)
  await p.close().catch(() => {})
}

console.log('closed', closed.length)
for (const c of closed) console.log('  X', c)

const left = ctx.pages()
console.log('remaining', left.length)
for (const p of left) {
  console.log('-', (await p.title()).slice(0, 60), p.url().slice(0, 80))
}

process.exit(0)
