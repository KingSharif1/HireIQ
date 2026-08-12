/**
 * Reload HireIQ to 0.9.1 and verify Greenhouse combobox options (Yes/No) can be read.
 * Uses existing CDP Chrome only.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-combo-smoke')
mkdirSync(DIR, { recursive: true })
const EXT_ID = 'ppjfhfeklglodfcpkkomggdckpdckdao'
const JOB = 'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008'

function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      const t = setTimeout(() => reject(new Error('timeout ' + method)), 30000)
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

async function find(includes, type) {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json()
  return list.find(
    (p) =>
      (!type || p.type === type) &&
      (p.url || '').includes(includes) &&
      p.webSocketDebuggerUrl,
  )
}

const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json()
const browser = await cdpConnect(ver.webSocketDebuggerUrl)
await browser.send('Target.createTarget', { url: `chrome-extension://${EXT_ID}/src/popup.html` })
await new Promise((r) => setTimeout(r, 1000))
let ext = await find(EXT_ID)
const e1 = await cdpConnect(ext.webSocketDebuggerUrl)
console.log(
  'before',
  (await e1.send('Runtime.evaluate', { expression: 'chrome.runtime.getManifest().version', returnByValue: true }))
    .result?.value,
)
try {
  await e1.send('Runtime.evaluate', { expression: 'chrome.runtime.reload()', returnByValue: true })
} catch (_) {}
try {
  e1.ws.close()
} catch (_) {}
await new Promise((r) => setTimeout(r, 3500))
await browser.send('Target.createTarget', { url: `chrome-extension://${EXT_ID}/src/popup.html` })
await new Promise((r) => setTimeout(r, 1000))
ext = await find(EXT_ID)
const e2 = await cdpConnect(ext.webSocketDebuggerUrl)
console.log(
  'after',
  (await e2.send('Runtime.evaluate', { expression: 'chrome.runtime.getManifest().version', returnByValue: true }))
    .result?.value,
)
e2.ws.close()

await browser.send('Target.createTarget', { url: JOB })
await new Promise((r) => setTimeout(r, 5500))
const jobMeta = (await find('4904960008', 'page')) || (await find('greenhouse', 'page'))
const job = await cdpConnect(jobMeta.webSocketDebuggerUrl)

const readExpr = `(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const input = [...document.querySelectorAll('input[role=combobox]')].find(el => {
    const label = document.getElementById(el.getAttribute('aria-labelledby') || '')?.textContent || '';
    return /sponsorship/i.test(label);
  });
  if (!input) return Promise.resolve({ err: 'no sponsorship combobox' });
  const control = input.closest('.select__control') || input;
  const rect = control.getBoundingClientRect();
  const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
    control.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:cx,clientY:cy,view:window}));
  }
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  return sleep(300).then(() => {
    const menuId = input.getAttribute('aria-controls');
    const menu = (menuId && document.getElementById(menuId)) || document.querySelector('.select__menu');
    const options = [...(menu||document).querySelectorAll('.select__option,[role=option]')]
      .map(o => (o.textContent||'').replace(/\\s+/g,' ').trim())
      .filter(Boolean);
    input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    const panel = document.getElementById('hireiq-panel-root')?.shadowRoot;
    return {
      options,
      hasYesNo: options.includes('Yes') && options.includes('No'),
      smallList: options.length >= 2 && options.length <= 8,
      panel: !!panel,
      versionUi: !!panel?.querySelector('#hiq-files-hint'),
    };
  });
})()`

const combo = (
  await job.send('Runtime.evaluate', { expression: readExpr, awaitPromise: true, returnByValue: true })
).result?.value
console.log('combo', combo)

writeFileSync(join(DIR, 'result.json'), JSON.stringify(combo, null, 2))
try {
  const shot = await job.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(DIR, 'panel.png'), Buffer.from(shot.data, 'base64'))
} catch (_) {}

job.ws.close()
browser.ws.close()

const ok = combo?.hasYesNo && combo?.smallList
console.log('PASS_COMBO', !!ok)
process.exit(ok ? 0 : 2)
