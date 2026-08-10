/** Heuristics: page looks like ATS signup / login rather than a filled apply form. */

export type AuthWallResult = {
  needsAccount: boolean
  kind: 'login' | 'signup' | 'apply' | 'unknown'
  reason: string
}

/** Pure signals — unit-testable without a DOM. */
export function detectAuthWallFromSignals(input: {
  text: string
  passwordCount: number
  applyFieldCount: number
}): AuthWallResult {
  const text = input.text.replace(/\s+/g, ' ').slice(0, 8000).toLowerCase()
  const hasPassword = input.passwordCount > 0
  const applyFields = input.applyFieldCount

  const signupHints =
    /create (an )?account|sign up|register|new user|join (us|now)|don't have an account|create your profile/i.test(
      text,
    )
  const loginHints =
    /sign in|log in|already have an account|welcome back|forgot (your )?password/i.test(text)

  if (hasPassword && signupHints && applyFields < 2) {
    return {
      needsAccount: true,
      kind: 'signup',
      reason: 'This page asks you to create an account before applying.',
    }
  }
  if (hasPassword && loginHints && applyFields < 2) {
    return {
      needsAccount: true,
      kind: 'login',
      reason: 'This page asks you to sign in to the employer site.',
    }
  }
  if (input.passwordCount >= 2 && applyFields < 2) {
    return {
      needsAccount: true,
      kind: 'signup',
      reason: 'Looks like an account registration form.',
    }
  }

  return {
    needsAccount: false,
    kind: applyFields > 0 ? 'apply' : 'unknown',
    reason: 'Application form detected (or unknown page).',
  }
}

export function detectAuthWall(doc: Document): AuthWallResult {
  const text = doc.body?.innerText || ''
  const passwordCount = doc.querySelectorAll('input[type="password"]').length
  const applyFieldCount = doc.querySelectorAll(
    'input[name="first_name"], input[name="last_name"], input[name="resume"], textarea[name="cover_letter"], #first_name, #last_name',
  ).length
  return detectAuthWallFromSignals({ text, passwordCount, applyFieldCount })
}
