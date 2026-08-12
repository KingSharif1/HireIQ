/**
 * chrome.runtime.reload() HireIQ, open Greenhouse, assert v0.8 panel markers.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.ui-audit', 'ext-v08-smoke')
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

// Ensure popup exists so we have an extension context
await browser.send('Target.createTarget', {
  url: `chrome-extension://${EXT_ID}/src/popup.html`,
})
await new Promise((r) => setTimeout(r, 1200))

let extMeta = await findExtContext()
if (!extMeta) {
  console.error('no extension context')
  process.exit(1)
}
console.log('ext context', extMeta.type, extMeta.url)

const ext = await cdpConnect(extMeta.webSocketDebuggerUrl)
const versionBefore = await ext.send('Runtime.evaluate', {
  expression: 'chrome.runtime.getManifest().version',
  returnByValue: true,
})
console.log('version before reload', versionBefore.result?.value)

// Fire reload (connection will drop)
try {
  await ext.send('Runtime.evaluate', {
    expression: 'chrome.runtime.reload()',
    returnByValue: true,
  })
} catch (_) {
  // expected — context destroyed
}
try {
  ext.ws.close()
} catch (_) {}

console.log('waiting for extension reload…')
await new Promise((r) => setTimeout(r, 3500))

// Wake SW again
await browser.send('Target.createTarget', {
  url: `chrome-extension://${EXT_ID}/src/popup.html`,
})
await new Promise((r) => setTimeout(r, 1500))

extMeta = await findExtContext()
if (extMeta) {
  const ext2 = await cdpConnect(extMeta.webSocketDebuggerUrl)
  const versionAfter = await ext2.send('Runtime.evaluate', {
    expression: 'chrome.runtime.getManifest().version + " | " + (chrome.runtime.getManifest().content_scripts?.[0]?.js||[]).join(",")',
    returnByValue: true,
  })
  console.log('version after reload', versionAfter.result?.value)
  ext2.ws.close()
}

await browser.send('Target.createTarget', { url: JOB })
await new Promise((r) => setTimeout(r, 7000))

const jobMeta = (await findPage('4904960008')) || (await findPage('greenhouse.io'))
if (!jobMeta) {
  console.error('no job page')
  process.exit(1)
}
const job = await cdpConnect(jobMeta.webSocketDebuggerUrl)

const panelExpr = `(() => {
  const root = document.getElementById('hireiq-panel-root');
  const sr = root && root.shadowRoot;
  if (!sr) return { panel: false, title: document.title };
  const save = sr.getElementById('hiq-save');
  const autofill = sr.getElementById('hiq-autofill');
  const chip = sr.getElementById('hiq-saved-chip');
  const profile = sr.getElementById('hiq-autofill-info');
  const fields = sr.querySelector('.fields-details');
  return {
    panel: true,
    status: ((sr.getElementById('hiq-status') && sr.getElementById('hiq-status').textContent) || '').trim().slice(0,160),
    saveHidden: !!(save && save.hidden),
    saveText: save ? (save.textContent || '').trim() : null,
    chipHidden: chip ? !!chip.hidden : null,
    hasSavedChipEl: !!chip,
    autofillDisabled: !!(autofill && autofill.disabled),
    submitDisabled: !!(sr.getElementById('hiq-submit') && sr.getElementById('hiq-submit').disabled),
    profileOpen: !!(profile && profile.open),
    hasAutofillDetails: !!profile,
    fieldsDetails: !!fields,
    resumeSection: !!(sr.getElementById('hiq-files-body')),
    pageKind: ((sr.getElementById('hiq-page-kind') && sr.getElementById('hiq-page-kind').textContent) || '').trim(),
    showFieldsLabel: ((fields && fields.querySelector('summary') && fields.querySelector('summary').textContent) || '').trim(),
  };
})()`

let panel = null
for (let i = 0; i < 10; i++) {
  const res = await job.send('Runtime.evaluate', { expression: panelExpr, returnByValue: true })
  panel = res.result?.value
  console.log('try', i + 1, panel?.panel ? 'YES' : 'no', panel?.saveText || '', panel?.pageKind || '')
  if (panel?.panel) break
  await new Promise((r) => setTimeout(r, 1000))
}

try {
  const shot = await job.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(DIR, 'panel.png'), Buffer.from(shot.data, 'base64'))
} catch (e) {
  console.warn(e.message)
}

writeFileSync(join(DIR, 'result.json'), JSON.stringify({ panel }, null, 2))
job.ws.close()
browser.ws.close()

const ok =
  panel?.panel &&
  panel.hasSavedChipEl &&
  panel.hasAutofillDetails &&
  panel.fieldsDetails &&
  (panel.autofillDisabled === true || panel.saveHidden === true || panel.chipHidden === false)

console.log('PASS_V08_PANEL', !!ok)
process.exit(ok ? 0 : 2)
