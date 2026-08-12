import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-combo-inspect')
mkdirSync(DIR, { recursive: true })

function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      const t = setTimeout(() => reject(new Error('timeout ' + method)), 25000)
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
  console.error('no greenhouse')
  process.exit(1)
}
const job = await cdpConnect(jobMeta.webSocketDebuggerUrl)

const findExpr = `(() => {
  const labels = [...document.querySelectorAll('label, legend, .label, [class*="label"]')];
  const hit = labels.find(el => /legal sponsorship/i.test(el.textContent || '') && (el.textContent || '').length < 200);
  if (!hit) return { err: 'no sponsorship label' };
  let root = hit.closest('div, fieldset, li, section') || hit.parentElement;
  // walk up a few levels for a container that holds the control
  for (let i = 0; i < 6 && root; i++) {
    const controls = root.querySelectorAll('input, button, [role=combobox], select');
    if (controls.length) break;
    root = root.parentElement;
  }
  const html = root ? root.outerHTML.slice(0, 3500) : '';
  const controls = root
    ? [...root.querySelectorAll('input, button, [role=combobox], select, [aria-haspopup], ul, li')].slice(0, 30).map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type') || '',
        role: el.getAttribute('role') || '',
        ariaHaspopup: el.getAttribute('aria-haspopup') || '',
        ariaExpanded: el.getAttribute('aria-expanded') || '',
        ariaControls: el.getAttribute('aria-controls') || '',
        ariaLabelledby: el.getAttribute('aria-labelledby') || '',
        placeholder: el.getAttribute('placeholder') || '',
        name: el.getAttribute('name') || '',
        id: el.id || '',
        className: (el.className || '').toString().slice(0, 120),
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
      }))
    : [];
  return { label: (hit.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160), controls, html };
})()`

const found = (await job.send('Runtime.evaluate', { expression: findExpr, returnByValue: true })).result?.value
console.log('FOUND', JSON.stringify({ label: found?.label, controls: found?.controls }, null, 2))
writeFileSync(join(DIR, 'before-click.json'), JSON.stringify(found, null, 2))

// Click the combobox and read options
const openExpr = `(() => {
  const labels = [...document.querySelectorAll('label, legend, .label, [class*="label"]')];
  const hit = labels.find(el => /legal sponsorship/i.test(el.textContent || '') && (el.textContent || '').length < 200);
  if (!hit) return { err: 'no label' };
  let root = hit.closest('div, fieldset, li, section') || hit.parentElement;
  for (let i = 0; i < 8 && root; i++) {
    if (root.querySelector('[role=combobox], input, button, select')) break;
    root = root.parentElement;
  }
  const combo =
    root?.querySelector('[role=combobox]') ||
    root?.querySelector('input[aria-haspopup]') ||
    root?.querySelector('button[aria-haspopup]') ||
    root?.querySelector('input');
  if (!combo) return { err: 'no combo', rootClass: (root?.className || '').toString().slice(0, 100) };
  combo.focus();
  combo.click();
  return {
    clicked: true,
    tag: combo.tagName,
    id: combo.id,
    role: combo.getAttribute('role'),
    ariaExpanded: combo.getAttribute('aria-expanded'),
    ariaControls: combo.getAttribute('aria-controls'),
  };
})()`

const opened = (await job.send('Runtime.evaluate', { expression: openExpr, returnByValue: true })).result?.value
console.log('OPEN', JSON.stringify(opened, null, 2))
await new Promise((r) => setTimeout(r, 800))

const optsExpr = `(() => {
  const listboxes = [...document.querySelectorAll('[role=listbox], [role=menu], ul[class*="select"], div[class*="select"]')];
  const options = [...document.querySelectorAll('[role=option], [role=menuitem], li[class*="option"], li[id]')].map(el => ({
    role: el.getAttribute('role') || '',
    id: el.id || '',
    text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
    ariaSelected: el.getAttribute('aria-selected') || '',
    className: (el.className || '').toString().slice(0, 80),
  })).filter(o => o.text && o.text.length < 60);
  return {
    listboxCount: listboxes.length,
    listboxes: listboxes.slice(0, 5).map(el => ({
      role: el.getAttribute('role'),
      id: el.id,
      className: (el.className || '').toString().slice(0, 100),
      childCount: el.children.length,
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 200),
    })),
    options: options.slice(0, 30),
  };
})()`

const opts = (await job.send('Runtime.evaluate', { expression: optsExpr, returnByValue: true })).result?.value
console.log('OPTS', JSON.stringify(opts, null, 2))
writeFileSync(join(DIR, 'after-click.json'), JSON.stringify({ opened, opts }, null, 2))

// Escape to close
await job.send('Runtime.evaluate', {
  expression: `document.activeElement && document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`,
  returnByValue: true,
})

job.ws.close()
