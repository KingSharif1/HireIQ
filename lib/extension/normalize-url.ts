/**
 * Normalize job apply URLs for identity / dedupe.
 * Strips hash + common tracking params; keeps ATS job id paths.
 */

const DROP_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
  'gh_src',
])

export function normalizeApplyUrl(urlString: string): string {
  let url: URL
  try {
    url = new URL(urlString.trim())
  } catch {
    return urlString.trim()
  }

  url.hash = ''
  const kept = new URLSearchParams()
  url.searchParams.forEach((value, key) => {
    if (DROP_PARAMS.has(key.toLowerCase())) return
    kept.set(key, value)
  })
  url.search = kept.toString()

  // Greenhouse: prefer boards-api style path without trailing slash noise
  let path = url.pathname.replace(/\/+$/, '') || '/'
  url.pathname = path

  return url.toString()
}
