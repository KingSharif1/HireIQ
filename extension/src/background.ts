import { detectJobPage } from './detect'
import { ensureAccessToken, exchangeWebsiteConnectCode } from './auth'
import { getSettings } from './settings'

chrome.runtime.onInstalled.addListener(() => {
  console.info('HireIQ extension installed')
})

type FetchMessage = {
  type: 'HIREIQ_FETCH'
  url: string
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
    responseType?: 'json' | 'base64'
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'HIREIQ_DETECT' && sender.tab?.id != null) {
    const detect = message.detect as { isJobPage?: boolean }
    void chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: detect.isJobPage ? '•' : '',
    })
    void chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: '#0d9488',
    })
    return
  }

  if (message?.type === 'HIREIQ_GET_BEARER') {
    void ensureAccessToken()
      .then(token => sendResponse({ ok: true, token }))
      .catch(err =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Not signed in',
        }),
      )
    return true
  }

  if (message?.type === 'HIREIQ_FETCH') {
    const msg = message as FetchMessage
    void (async () => {
      try {
        const res = await fetch(msg.url, {
          method: msg.init?.method || 'GET',
          headers: msg.init?.headers,
          body: msg.init?.body,
        })
        const contentType = res.headers.get('content-type') || ''

        if (msg.init?.responseType === 'base64') {
          // PDF (or other binary): arrayBuffer → base64 for content-script File attach
          if (!res.ok) {
            const text = await res.text()
            let json: unknown = null
            try {
              json = JSON.parse(text)
            } catch {
              json = null
            }
            sendResponse({
              ok: false,
              status: res.status,
              json,
              text,
              contentType,
              error: (json as { error?: string } | null)?.error || `HTTP ${res.status}`,
            })
            return
          }
          // JSON "not available" responses
          if (contentType.includes('application/json')) {
            const text = await res.text()
            let json: unknown = null
            try {
              json = JSON.parse(text)
            } catch {
              json = null
            }
            sendResponse({ ok: res.ok, status: res.status, json, text, contentType })
            return
          }
          const buf = await res.arrayBuffer()
          sendResponse({
            ok: res.ok,
            status: res.status,
            base64: arrayBufferToBase64(buf),
            contentType,
          })
          return
        }

        const text = await res.text()
        let json: unknown = null
        try {
          json = JSON.parse(text)
        } catch {
          json = null
        }
        sendResponse({ ok: res.ok, status: res.status, json, text, contentType })
      } catch (err) {
        sendResponse({
          ok: false,
          status: 0,
          error: err instanceof Error ? err.message : 'Fetch failed',
        })
      }
    })()
    return true
  }

  if (message?.type === 'HIREIQ_INJECT' && typeof message.tabId === 'number') {
    void injectContentScripts(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(err =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : 'inject failed' }),
      )
    return true
  }
})

/** Website → extension handshake (externally_connectable). */
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'HIREIQ_CONNECT_CODE' || typeof message.code !== 'string') {
    sendResponse({ ok: false, error: 'Unknown message' })
    return
  }

  void (async () => {
    try {
      const settings = await getSettings()
      const apiBase = settings.apiBaseUrl || 'http://localhost:3000'
      await exchangeWebsiteConnectCode(message.code, apiBase)
      sendResponse({ ok: true })
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : 'Connect failed',
      })
    }
  })()
  return true
})

/** Ensure panel can load even when Chrome site-access is restricted to "On click". */
async function injectContentScripts(tabId: number) {
  try {
    const files = chrome.runtime.getManifest().content_scripts?.[0]?.js
    if (!files?.length) return
    await chrome.scripting.executeScript({ target: { tabId }, files })
  } catch (err) {
    console.warn('HireIQ content inject failed', err)
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return
  const detect = detectJobPage(tab.url)
  void chrome.action.setBadgeText({
    tabId,
    text: detect.isJobPage ? '•' : '',
  })
  void chrome.action.setBadgeBackgroundColor({ tabId, color: '#0d9488' })
  if (detect.isJobPage) {
    void injectContentScripts(tabId)
  }
})
