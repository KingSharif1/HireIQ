/** Proxy API calls through the service worker (avoids page CORS / mixed-content). */

export type ProxyResult = {
  ok: boolean
  status: number
  json?: unknown
  text?: string
  error?: string
  /** Present when responseType was 'base64' (e.g. PDF bytes). */
  base64?: string
  contentType?: string
}

export async function extensionFetch(
  url: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
    /** 'json' (default) parses text; 'base64' returns arrayBuffer as base64. */
    responseType?: 'json' | 'base64'
  },
): Promise<ProxyResult> {
  return chrome.runtime.sendMessage({
    type: 'HIREIQ_FETCH',
    url,
    init,
  }) as Promise<ProxyResult>
}

export async function getExtensionBearer(): Promise<string> {
  const res = (await chrome.runtime.sendMessage({ type: 'HIREIQ_GET_BEARER' })) as {
    ok: boolean
    token?: string
    error?: string
  }
  if (!res?.ok || !res.token) {
    throw new Error(res?.error || 'Sign in with Google in the HireIQ popup first')
  }
  return res.token
}

/** Decode SW base64 payload into a Blob/File for DataTransfer attach. */
export function base64ToFile(base64: string, filename: string, contentType: string): File {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], filename, { type: contentType || 'application/pdf' })
}
