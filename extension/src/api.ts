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

export function isExtensionContextDead(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '')
  return /extension context invalidated/i.test(msg) || /context invalidated/i.test(msg)
}

export function friendlyExtensionError(err: unknown): string {
  if (isExtensionContextDead(err)) {
    return 'HireIQ was updated — refresh this tab, then try again.'
  }
  return err instanceof Error ? err.message : String(err || 'Something went wrong')
}

async function sendRuntimeMessage<T>(payload: unknown): Promise<T> {
  try {
    return (await chrome.runtime.sendMessage(payload)) as T
  } catch (err) {
    if (isExtensionContextDead(err)) {
      throw new Error('HireIQ was updated — refresh this tab, then try again.')
    }
    throw err
  }
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
  return sendRuntimeMessage<ProxyResult>({
    type: 'HIREIQ_FETCH',
    url,
    init,
  })
}

export async function getExtensionBearer(): Promise<string> {
  const res = await sendRuntimeMessage<{
    ok: boolean
    token?: string
    error?: string
  }>({ type: 'HIREIQ_GET_BEARER' })
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
