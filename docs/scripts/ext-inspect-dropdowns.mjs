import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-dropdown-inspect')
mkdirSync(DIR, { recursive: true })

function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      const t = setTimeout(() => reject(new Error('timeout ' + method)), 20000)
      pending.set(msgId, { resolve, reject, t })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString())
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, t } = pending.get(msg.id)
      clearTimeout(t)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    }
  })
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve({ ws, send }))
    ws.addEventListener('error', reject)
  })
}

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json()
const jobMeta = list.find((p) => p.type === 'page' && p.url?.includes('greenhouse') && p.webSocketDebuggerUrl)
if (!jobMeta) {
  console.error('no greenhouse tab')
  process.exit(1)
}

const job = await cdpConnect(jobMeta.webSocketDebuggerUrl)
const expr = `(() => {
  const allSelects = [...document.querySelectorAll('select')].map((el) => ({
    name: el.name,
    id: el.id,
    label: ((el.labels && el.labels[0] && el.labels[0].innerText) || '').replace(/\\s+/g, ' ').trim().slice(0, 120),
    optionCount: el.options.length,
    options: [...el.options].slice(0, 8).map((o) => ({
      v: o.value,
      t: (o.textContent || '').trim().slice(0, 40),
      disabled: o.disabled,
    })),
  }))

  const combos = [...document.querySelectorAll('[role="listbox"], [role="combobox"], [aria-haspopup="listbox"]')].map((el) => ({
    tag: el.tagName,
    role: el.getAttribute('role'),
    label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 100),
  }))

  const panel = document.getElementById('hireiq-panel-root')?.shadowRoot
  return {
    selectCount: allSelects.length,
    allSelects,
    comboCount: combos.length,
    combos: combos.slice(0, 10),
    hasChoiceRow: !!panel?.querySelector('.choice-row'),
    hasFilesHint: !!panel?.querySelector('#hiq-files-hint'),
    reviewSnippet: (panel?.getElementById('hiq-review')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 500),
  }
})()`

const res = await job.send('Runtime.evaluate', { expression: expr, returnByValue: true })
const value = res.result?.value
console.log(JSON.stringify(value, null, 2))
writeFileSync(join(DIR, 'result.json'), JSON.stringify(value, null, 2))
job.ws.close()
