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
const job = await cdpConnect(jobMeta.webSocketDebuggerUrl)

const expr = `(() => {
  const input = document.getElementById('question_12845686008');
  if (!input) return { err: 'no input' };
  const control = input.closest('.select__control') || input.closest('.select-shell') || input.parentElement;
  const shell = input.closest('.select-shell') || input.closest('[class*=select]');
  // click mouse events on control
  const target = control || input;
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window }));
  }
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  return {
    controlClass: (control?.className || '').toString().slice(0, 120),
    shellClass: (shell?.className || '').toString().slice(0, 120),
    ariaExpanded: input.getAttribute('aria-expanded'),
    menuId: input.getAttribute('aria-controls'),
  };
})()`

const opened = (await job.send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value
console.log('open', opened)
await new Promise((r) => setTimeout(r, 1000))

const optsExpr = `(() => {
  const input = document.getElementById('question_12845686008');
  const menuId = input?.getAttribute('aria-controls');
  const menu = (menuId && document.getElementById(menuId)) || document.querySelector('.select__menu, [class*="select__menu"]');
  const options = [...document.querySelectorAll('.select__option, [class*="select__option"], [id^="react-select"][id*="option"]')].map(el => ({
    id: el.id,
    text: (el.textContent || '').replace(/\\s+/g, ' ').trim(),
    className: (el.className || '').toString().slice(0, 100),
  }));
  // also any role=option near the question
  const nearby = input?.closest('.select-shell')?.parentElement;
  const nearOpts = nearby
    ? [...nearby.querySelectorAll('[role=option], .select__option')].map(el => (el.textContent || '').trim())
    : [];
  return {
    ariaExpanded: input?.getAttribute('aria-expanded'),
    menuId,
    menuText: menu ? (menu.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 300) : null,
    options: options.slice(0, 20),
    nearOpts,
    allReactSelectOptions: [...document.querySelectorAll('[id*="option"]')].filter(el => /yes|no/i.test(el.textContent || '')).map(el => ({
      id: el.id,
      text: (el.textContent || '').trim().slice(0, 40),
      className: (el.className || '').toString().slice(0, 80),
    })).slice(0, 20),
  };
})()`

const opts = (await job.send('Runtime.evaluate', { expression: optsExpr, returnByValue: true })).result?.value
console.log(JSON.stringify(opts, null, 2))
writeFileSync(join(DIR, 'react-select.json'), JSON.stringify({ opened, opts }, null, 2))

// close
await job.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await job.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })

job.ws.close()
