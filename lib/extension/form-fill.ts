/**
 * Shared form-field classification for extension autofill.
 * Pure — safe for Node tests and Chrome content scripts.
 */

export type AutofillProfile = {
  firstName: string
  lastName: string
  preferredName: string
  email: string
  phone: string
  linkedin: string
  website: string
  country: string
  howHeard: string
}

export type FieldKind =
  | 'first_name'
  | 'last_name'
  | 'preferred_name'
  | 'email'
  | 'phone'
  | 'linkedin'
  | 'website'
  | 'country'
  | 'how_heard'
  | 'skip'
  | 'unknown'

export type FieldMeta = {
  name: string
  id: string
  type: string
  label: string
  placeholder: string
  autocomplete: string
}

function norm(s: string) {
  return s.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Classify a form control from name/id/label/placeholder. */
export function classifyField(meta: FieldMeta): FieldKind {
  const type = (meta.type || '').toLowerCase()
  if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || type === 'file') {
    return 'skip'
  }

  const blob = norm(
    [meta.name, meta.id, meta.label, meta.placeholder, meta.autocomplete].filter(Boolean).join(' '),
  )
  if (!blob) return 'unknown'

  if (/\b(password|captcha|csrf|token|honeypot)\b/.test(blob)) return 'skip'
  if (/\b(cover\s*letter|resume|cv|attach)\b/.test(blob) && type === 'file') return 'skip'

  if (type === 'email' || /\b(e[\s-]?mail|emailaddress)\b/.test(blob)) return 'email'
  if (type === 'tel' || /\b(phone|mobile|cell|tel)\b/.test(blob)) return 'phone'

  if (/\b(preferred\s*(first\s*)?name|pref\s*name|nickname)\b/.test(blob)) return 'preferred_name'
  if (/\b(first\s*name|fname|given\s*name)\b/.test(blob) || meta.autocomplete === 'given-name') {
    return 'first_name'
  }
  if (/\b(last\s*name|lname|surname|family\s*name)\b/.test(blob) || meta.autocomplete === 'family-name') {
    return 'last_name'
  }
  // bare "name" often means full name — skip rather than wrong-fill
  if (/^(name|full name)$/.test(blob)) return 'unknown'

  if (/\blinkedin\b/.test(blob)) return 'linkedin'
  if (/\b(website|portfolio|personal\s*site|github\.com|homepage)\b/.test(blob)) return 'website'
  if (/\bcountry\b/.test(blob)) return 'country'
  if (/\b(how\s*did\s*you\s*hear|hear\s*about|referral\s*source|source)\b/.test(blob)) return 'how_heard'

  // Greenhouse-style name attrs
  if (meta.name === 'first_name' || meta.id === 'first_name') return 'first_name'
  if (meta.name === 'last_name' || meta.id === 'last_name') return 'last_name'
  if (meta.name === 'preferred_name') return 'preferred_name'

  return 'unknown'
}

export function valueForKind(kind: FieldKind, profile: AutofillProfile): string | null {
  switch (kind) {
    case 'first_name':
      return profile.firstName || null
    case 'last_name':
      return profile.lastName || null
    case 'preferred_name':
      return profile.preferredName || profile.firstName || null
    case 'email':
      return profile.email || null
    case 'phone':
      return profile.phone || null
    case 'linkedin':
      return profile.linkedin || null
    case 'website':
      return profile.website || null
    case 'country':
      return profile.country || null
    case 'how_heard':
      return profile.howHeard || null
    default:
      return null
  }
}

/** Known contact/identity fields we can fill from (or backfill into) master profile. */
export function isKnownProfileKind(kind: FieldKind): boolean {
  return kind !== 'unknown' && kind !== 'skip'
}

/** Fields worth offering “save to master” when the user fills a gap. */
export function isMasterBackfillKind(kind: FieldKind): boolean {
  return (
    kind === 'email' ||
    kind === 'phone' ||
    kind === 'linkedin' ||
    kind === 'website' ||
    kind === 'first_name' ||
    kind === 'last_name' ||
    kind === 'preferred_name' ||
    kind === 'country'
  )
}

/** Form field maps to a profile slot that is currently empty. */
export function isMissingProfileValue(kind: FieldKind, profile: AutofillProfile): boolean {
  return isKnownProfileKind(kind) && !valueForKind(kind, profile)
}

export function missingProfilePrompt(kind: FieldKind): string {
  switch (kind) {
    case 'email':
      return 'Add your email…'
    case 'phone':
      return 'Add your phone number…'
    case 'linkedin':
      return 'Add your LinkedIn URL…'
    case 'website':
      return 'Add your website / portfolio…'
    case 'first_name':
      return 'Add your first name…'
    case 'last_name':
      return 'Add your last name…'
    case 'preferred_name':
      return 'Add your preferred name…'
    case 'country':
      return 'Add your country…'
    case 'how_heard':
      return 'How did you hear about this role?'
    default:
      return 'Type your answer…'
  }
}

export function emptyAutofillProfile(): AutofillProfile {
  return {
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    linkedin: '',
    website: '',
    country: '',
    howHeard: 'LinkedIn',
  }
}

/** Re-export — single source of truth in sensitive-fields.ts */
export { isSensitiveFieldLabel } from './sensitive-fields'
