import { getSettings, saveSettings, isSignedIn } from './settings'
import { detectJobPage } from './detect'
import {
  signInWithGoogle,
  signOut,
  ensureAccessToken,
  openWebsiteConnect,
} from './auth'

const apiBaseUrlEl = document.getElementById('apiBaseUrl') as HTMLInputElement
const tokenEl = document.getElementById('token') as HTMLInputElement
const statusEl = document.getElementById('status') as HTMLDivElement
const pagePill = document.getElementById('pagePill') as HTMLDivElement
const saveSettingsBtn = document.getElementById('saveSettings') as HTMLButtonElement
const saveJobBtn = document.getElementById('saveJob') as HTMLButtonElement
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement
const googleBtn = document.getElementById('googleSignIn') as HTMLButtonElement
const signOutBtn = document.getElementById('signOut') as HTMLButtonElement

function setStatus(message: string, kind: 'ok' | 'err' | '' = '') {
  statusEl.textContent = message
  statusEl.className = `status${kind ? ` ${kind}` : ''}`
}

async function refreshAuthUi() {
  const s = await getSettings()
  apiBaseUrlEl.value = s.apiBaseUrl
  tokenEl.value = s.token
  if (s.accessToken) {
    connectBtn.textContent = 'Reconnect HireIQ'
    signOutBtn.hidden = false
    setStatus(s.userEmail ? `Connected as ${s.userEmail}` : 'Connected to HireIQ.', 'ok')
  } else if (s.token) {
    connectBtn.textContent = 'Connect HireIQ'
    signOutBtn.hidden = false
    setStatus('Connected with legacy token.', 'ok')
  } else {
    connectBtn.textContent = 'Connect HireIQ'
    signOutBtn.hidden = true
    setStatus('Connect HireIQ to Autofill and Save.')
  }
}

async function refreshPagePill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url) {
    pagePill.textContent = 'No active tab'
    pagePill.className = 'pill off'
    saveJobBtn.disabled = true
    return
  }
  const detect = detectJobPage(tab.url)
  if (detect.isJobPage) {
    pagePill.textContent = `Job page · ${detect.reason}`
    pagePill.className = 'pill on'
    saveJobBtn.disabled = false
  } else {
    pagePill.textContent = detect.reason
    pagePill.className = 'pill off'
    saveJobBtn.disabled = true
  }
}

async function load() {
  await refreshAuthUi()
  await refreshPagePill()
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id != null) {
    await chrome.runtime.sendMessage({ type: 'HIREIQ_INJECT', tabId: tab.id }).catch(() => {})
  }
}

connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true
  setStatus('Opening HireIQ…')
  try {
    const apiBase = apiBaseUrlEl.value.trim() || 'http://localhost:3000'
    await saveSettings({ apiBaseUrl: apiBase })
    await openWebsiteConnect(apiBase)
    setStatus('Finish sign-in in the HireIQ tab — this popup will show Connected when done.')
    // Poll storage briefly while user completes connect
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000))
      const s = await getSettings()
      if (s.accessToken) {
        setStatus(s.userEmail ? `Connected as ${s.userEmail}` : 'Connected to HireIQ.', 'ok')
        await refreshAuthUi()
        break
      }
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Connect failed', 'err')
  } finally {
    connectBtn.disabled = false
  }
})

googleBtn.addEventListener('click', async () => {
  googleBtn.disabled = true
  setStatus('Opening Google sign-in…')
  try {
    await saveSettings({
      apiBaseUrl: apiBaseUrlEl.value.trim() || 'http://localhost:3000',
    })
    const session = await signInWithGoogle()
    setStatus(session.email ? `Signed in as ${session.email}` : 'Signed in with Google.', 'ok')
    await refreshAuthUi()
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Sign-in failed', 'err')
  } finally {
    googleBtn.disabled = false
  }
})

signOutBtn.addEventListener('click', async () => {
  await signOut()
  await saveSettings({ token: '' })
  setStatus('Signed out.')
  await refreshAuthUi()
})

saveSettingsBtn.addEventListener('click', async () => {
  await saveSettings({
    apiBaseUrl: apiBaseUrlEl.value.trim() || 'http://localhost:3000',
    token: tokenEl.value.trim(),
  })
  setStatus('Legacy token saved.', 'ok')
  await refreshAuthUi()
})

saveJobBtn.addEventListener('click', async () => {
  saveJobBtn.disabled = true
  setStatus('Saving…')
  try {
    await saveSettings({
      apiBaseUrl: apiBaseUrlEl.value.trim() || 'http://localhost:3000',
    })
    const bearer = await ensureAccessToken()
    const settings = await getSettings()
    if (!isSignedIn(settings) && !bearer) throw new Error('Connect HireIQ first')

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) throw new Error('Open a job posting page first')

    const detect = detectJobPage(tab.url)
    if (!detect.isJobPage) throw new Error(detect.reason)

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const url = location.href
        const ogTitle =
          document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || ''
        const title =
          ogTitle ||
          document.querySelector('h1')?.textContent?.trim() ||
          document.title.replace(/\s*[|\-–—].*$/, '').trim() ||
          'Untitled role'
        const company =
          document
            .querySelector('[data-company], .company, .employer, [class*="companyName"]')
            ?.textContent?.trim() ||
          document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
          ''
        const locationText =
          document
            .querySelector('[data-location], .location, [class*="jobLocation"]')
            ?.textContent?.trim() || ''
        const main =
          document.querySelector(
            '[data-job-description], .job-description, #job-description, [class*="description"], article, main',
          ) || document.body
        let description = (main?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20000)
        if (description.length < 40) description = `Saved from ${url}`
        return {
          url,
          title: title.slice(0, 500),
          company: company.slice(0, 500),
          description,
          location: locationText.slice(0, 500),
        }
      },
    })

    if (!result) throw new Error('Could not scrape this page')

    const res = await fetch(`${settings.apiBaseUrl.replace(/\/$/, '')}/api/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    })
    const json = (await res.json().catch(() => ({}))) as {
      error?: string
      trackerUrl?: string
    }
    if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`)

    statusEl.innerHTML = ''
    statusEl.className = 'status ok'
    statusEl.append('Saved. ')
    if (json.trackerUrl) {
      const a = document.createElement('a')
      a.href = json.trackerUrl
      a.target = '_blank'
      a.rel = 'noreferrer'
      a.textContent = 'Open in tracker'
      statusEl.append(a)
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Save failed', 'err')
  } finally {
    await refreshPagePill()
  }
})

void load()
