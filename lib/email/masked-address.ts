/** Build a unique local-part for masked apply addresses. */

const LOCAL_MAX = 48

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 24)
}

function randomToken(length = 6): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

export function maskedEmailDomain(): string {
  const domain = process.env.MASKED_EMAIL_DOMAIN?.trim().toLowerCase()
  if (!domain) {
    throw new Error('MASKED_EMAIL_DOMAIN is not configured')
  }
  return domain.replace(/^@/, '')
}

export function buildMaskedLocalPart(opts: {
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}): string {
  const fromUsername = opts.username ? slugify(opts.username) : ''
  const fromName = slugify([opts.firstName, opts.lastName].filter(Boolean).join('.'))
  const fromEmail = opts.email?.includes('@')
    ? slugify(opts.email.split('@')[0] ?? '')
    : ''
  const base = fromUsername || fromName || fromEmail || 'apply'
  const token = randomToken(6)
  const local = `${base}.${token}`.slice(0, LOCAL_MAX)
  return local.replace(/^\.+|\.+$/g, '') || `apply.${token}`
}

export function buildMaskedEmail(opts: {
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  domain?: string
}): string {
  const domain = (opts.domain ?? maskedEmailDomain()).toLowerCase()
  return `${buildMaskedLocalPart(opts)}@${domain}`
}

/** Dedicated inbox for forwarding job postings into the tracker (Task 115). */
export function buildForwardSaveEmail(opts: {
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  domain?: string
}): string {
  const domain = (opts.domain ?? maskedEmailDomain()).toLowerCase()
  const token = randomToken(6)
  const fromUsername = opts.username ? slugify(opts.username) : ''
  const fromName = slugify([opts.firstName, opts.lastName].filter(Boolean).join('.'))
  const fromEmail = opts.email?.includes('@') ? slugify(opts.email.split('@')[0] ?? '') : ''
  const base = fromUsername || fromName || fromEmail || 'jobs'
  const local = `save.${base}.${token}`.slice(0, LOCAL_MAX).replace(/^\.+|\.+$/g, '')
  return `${local || `save.jobs.${token}`}@${domain}`
}

export function normalizeMaskedRecipient(address: string): string {
  return address.trim().toLowerCase().replace(/^<|>$/g, '')
}

/** Extract bare emails from Resend `to` values (may include display names). */
export function extractRecipientEmails(to: unknown): string[] {
  if (!Array.isArray(to)) return []
  const out: string[] = []
  for (const item of to) {
    if (typeof item !== 'string') continue
    const angle = item.match(/<([^>]+)>/)
    const raw = (angle?.[1] ?? item).trim()
    if (raw.includes('@')) out.push(normalizeMaskedRecipient(raw))
  }
  return out
}
