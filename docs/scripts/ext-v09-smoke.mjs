/**
 * v0.9 smoke on existing CDP Chrome: reload extension, assert Documents merge + choice UI hooks.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-v09-smoke')
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
    const raw = typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString()
    const msg = JSON.parse(raw)
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

async function findPage(includes) {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json()
  return list.find((p) => p.type === 'page' && p.url?.includes(includes) && p.webSocketDebuggerUrl)
}

async function findExtContext() {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json()
  return (
    list.find((t) => t.type === 'service_worker' && (t.url || '').includes(EXT_ID) && t.webSocketDebuggerUrl) ||
    list.find((t) => (t.url || '').includes(`chrome-extension://${EXT_ID}/`) && t.webSocketDebuggerUrl)
  )
}

const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json()
const browser = await cdpConnect(ver.webSocketDebuggerUrl)
await browser.send('Target.createTarget', { url: `chrome-extension://${EXT_ID}/src/popup.html` })
await new Promise((r) => setTimeout(r, 1000))

let extMeta = await findExtContext()
if (!extMeta) {
  console.error('no extension context — is HireIQ loaded in this Chrome?')
  process.exit(1)
}
const ext = await cdpConnect(extMeta.webSocketDebuggerUrl)
console.log('before', (await ext.send('Runtime.evaluate', { expression: 'chrome.runtime.getManifest().version', returnByValue: true })).result?.value)
try {
  await ext.send('Runtime.evaluate', { expression: 'chrome.runtime.reload()', returnByValue: true })
} catch (_) {}
try {
  ext.ws.close()
} catch (_) {}
await new Promise((r) => setTimeout(r, 3500))

await browser.send('Target.createTarget', { url: `chrome-extension://${EXT_ID}/src/popup.html` })
await new Promise((r) => setTimeout(r, 1000))
extMeta = await findExtContext()
if (extMeta) {
  const e2 = await cdpConnect(extMeta.webSocketDebuggerUrl)
  console.log(
    'after',
    (
      await e2.send('Runtime.evaluate', {
        expression: 'chrome.runtime.getManifest().version',
        returnByValue: true,
      })
    ).result?.value,
  )
  e2.ws.close()
}

await browser.send('Target.createTarget', { url: JOB })
await new Promise((r) => setTimeout(r, 6000))
const jobMeta = (await findPage('4904960008')) || (await findPage('greenhouse'))
const job = await cdpConnect(jobMeta.webSocketDebuggerUrl)

const expr = `(() => {
  const sr = document.getElementById('hireiq-panel-root')?.shadowRoot;
  if (!sr) return { panel: false };
  const files = sr.getElementById('hiq-files');
  const post = sr.getElementById('hiq-postsave');
  const gen = sr.getElementById('hiq-gen-resume');
  return {
    panel: true,
    savedChip: !sr.getElementById('hiq-saved-chip')?.hidden,
    filesShown: files?.classList.contains('show') || false,
    hasPostSaveSection: !!post,
    hasGenInDom: !!gen || (files?.innerText || '').includes('Generate tailored resume'),
    filesText: (files?.innerText || '').replace(/\\s+/g, ' ').slice(0, 220),
    pageKind: (sr.getElementById('hiq-page-kind')?.textContent || '').trim(),
  };
})()`

let snap = null
for (let i = 0; i < 8; i++) {
  snap = (await job.send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value
  console.log('try', i + 1, snap)
  if (snap?.panel) break
  await new Promise((r) => setTimeout(r, 800))
}

try {
  const shot = await job.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(DIR, 'panel.png'), Buffer.from(shot.data, 'base64'))
} catch (_) {}
writeFileSync(join(DIR, 'result.json'), JSON.stringify(snap, null, 2))
job.ws.close()
browser.ws.close()

const ok = snap?.panel && !snap.hasPostSaveSection && (snap.filesShown || snap.hasGenInDom || snap.savedChip)
console.log('PASS_V09', !!ok)
process.exit(ok ? 0 : 2)
