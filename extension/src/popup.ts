import { getSettings, saveSettings, isSignedIn } from './settings'
import { defaultApiBaseUrl, IS_DEV_BUILD, PROD_APP_URL } from './env'
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
const authPill = document.getElementById('authPill') as HTMLSpanElement
const subtitleEl = document.getElementById('subtitle') as HTMLParagraphElement
const hintEl = document.getElementById('hint') as HTMLParagraphElement
const saveSettingsBtn = document.getElementById('saveSettings') as HTMLButtonElement
const saveJobBtn = document.getElementById('saveJob') as HTMLButtonElement
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement
const googleBtn = document.getElementById('googleSignIn') as HTMLButtonElement
const signOutBtn = document.getElementById('signOut') as HTMLButtonElement
const devPanel = document.getElementById('devPanel') as HTMLDivElement
const advancedPanel = document.getElementById('advancedPanel') as HTMLDetailsElement

function setStatus(message: string, kind: 'ok' | 'err' | '' = '') {
  statusEl.textContent = message
  statusEl.className = `status${kind ? ` ${kind}` : ''}`
}

async function resolveApiBase(): Promise<string> {
  if (!IS_DEV_BUILD) return PROD_APP_URL
  const typed = apiBaseUrlEl.value.trim()
  if (typed) return typed
  const s = await getSettings()
  return s.apiBaseUrl || defaultApiBaseUrl()
}

async function refreshAuthUi() {
  const s = await getSettings()
  if (IS_DEV_BUILD) {
    apiBaseUrlEl.value = s.apiBaseUrl
    tokenEl.value = s.token
  }

  if (s.accessToken) {
    authPill.textContent = 'Connected'
    authPill.className = 'auth-pill on'
    connectBtn.textContent = 'Reconnect'
    signOutBtn.hidden = false
    subtitleEl.textContent = s.userEmail
      ? `Signed in as ${s.userEmail}`
      : 'Extension linked to your HireIQ account.'
    setStatus(s.userEmail ? `Ready · ${s.userEmail}` : 'Ready · connected to HireIQ.', 'ok')
    hintEl.textContent = 'On a job page, use Save here or Autofill in the side panel.'
  } else if (s.token) {
    authPill.textContent = 'Connected'
    authPill.className = 'auth-pill on'
    connectBtn.textContent = 'Connect HireIQ'
    signOutBtn.hidden = false
    subtitleEl.textContent = 'Linked with a legacy token.'
    setStatus('Connected with legacy token.', 'ok')
    hintEl.textContent = 'Prefer Connect HireIQ (account sign-in) for production.'
  } else {
    authPill.textContent = 'Not connected'
    authPill.className = 'auth-pill off'
    connectBtn.textContent = 'Connect HireIQ'
    signOutBtn.hidden = true
    subtitleEl.textContent = 'Link this extension to your HireIQ account.'
    setStatus('Connect to Autofill and Save.')
    hintEl.textContent =
      'Already signed in on HireIQ? Connect links instantly. Otherwise sign in once in the tab that opens.'
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
  if (IS_DEV_BUILD) {
    devPanel.hidden = false
    advancedPanel.hidden = false
  } else {
    devPanel.hidden = true
    advancedPanel.hidden = true
    // Ensure Store builds persist the prod API host.
    await saveSettings({ apiBaseUrl: PROD_APP_URL })
  }

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
    const apiBase = await resolveApiBase()
    await saveSettings({ apiBaseUrl: apiBase })
    await openWebsiteConnect(apiBase)
    setStatus('Finish in the HireIQ tab if asked — this popup updates when linked.')
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 1000))
      const s = await getSettings()
      if (s.accessToken) {
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
    await saveSettings({ apiBaseUrl: await resolveApiBase() })
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
    apiBaseUrl: await resolveApiBase(),
    token: tokenEl.value.trim(),
  })
  setStatus('Legacy token saved.', 'ok')
  await refreshAuthUi()
})

saveJobBtn.addEventListener('click', async () => {
  saveJobBtn.disabled = true
  setStatus('Saving…')
  try {
    await saveSettings({ apiBaseUrl: await resolveApiBase() })
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
