/** User-facing auth error messages. */

const AUTH_ERRORS: Record<string, string> = {
  auth_failed: 'Sign-in failed. Try again or use a different method.',
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Confirm your email first — check your inbox for the link.',
  google_not_enabled:
    'Google sign-in is not enabled yet. Use email/password, or ask an admin to enable Google in Supabase Auth.',
}

export function authErrorMessage(code: string | null | undefined, fallback?: string): string | null {
  if (!code && !fallback) return null
  if (code && AUTH_ERRORS[code]) return AUTH_ERRORS[code]
  return fallback ?? null
}

export function mapSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return AUTH_ERRORS.invalid_credentials
  }
  if (lower.includes('email not confirmed')) {
    return AUTH_ERRORS.email_not_confirmed
  }
  if (
    lower.includes('provider is not enabled') ||
    lower.includes('unsupported provider') ||
    lower.includes('validation_failed')
  ) {
    return AUTH_ERRORS.google_not_enabled
  }
  return message
}

export interface ParsedAuthNames {
  firstName: string
  lastName: string
  fullName: string
}

/** Extract display names from Supabase user_metadata (email signup or OAuth). */
export function parseAuthNames(metadata: Record<string, unknown> | undefined): ParsedAuthNames {
  const meta = metadata ?? {}
  let firstName = String(meta.first_name ?? meta.given_name ?? '').trim()
  let lastName = String(meta.last_name ?? meta.family_name ?? '').trim()
  let fullName = String(meta.full_name ?? meta.name ?? '').trim()

  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean)
    firstName = parts[0] ?? ''
    lastName = parts.slice(1).join(' ')
  }

  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, lastName].filter(Boolean).join(' ')
  }

  return { firstName, lastName, fullName }
}
