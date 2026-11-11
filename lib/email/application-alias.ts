/**
 * Per-application tracking alias (decision #9): instead of one masked address
 * per user + fuzzy company matching, mint a unique, reversible alias for each
 * application so inbound employer mail resolves to the application by address.
 *
 * Alias shape: `hireiq.<application-uuid>@<masked-domain>`. The full UUID in
 * the local part makes matching exact — no lookup table, no fuzzy scoring.
 */

const ALIAS_PREFIX = 'hireiq'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `hireiq.<applicationId>@<domain>` — reversible, opaque to the employer. */
export function buildApplicationAlias(applicationId: string, domain: string): string {
  const id = applicationId.trim().toLowerCase()
  if (!UUID_RE.test(id)) throw new Error('applicationId must be a UUID')
  return `${ALIAS_PREFIX}.${id}@${domain.replace(/^@/, '').trim().toLowerCase()}`
}

function bareAddress(recipient: string): string {
  return recipient.includes('<') ? (recipient.match(/<([^>]+)>/)?.[1] ?? recipient) : recipient
}

/** The application UUID encoded in an alias recipient, or null when it isn't one. */
export function applicationIdFromAlias(recipient: string): string | null {
  const bare = bareAddress(recipient).trim().toLowerCase()
  const local = bare.split('@')[0] ?? ''
  if (!local.startsWith(`${ALIAS_PREFIX}.`)) return null
  const id = local.slice(ALIAS_PREFIX.length + 1)
  return UUID_RE.test(id) ? id : null
}

export function isApplicationAlias(recipient: string): boolean {
  return applicationIdFromAlias(recipient) !== null
}
