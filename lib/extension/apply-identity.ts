export type EmailTrackingMode = 'gmail' | 'masked' | 'off'

export type ApplyIdentity = {
  mode: EmailTrackingMode
  canCreateAccount: boolean
  canPollVerificationCode: boolean
  applyEmail: string | null
  panelTitle: string
  panelBody: string
  primaryAction: 'create-and-continue' | 'save-email-only' | 'autofill-only' | null
}

export function resolveApplyIdentity(input: {
  mode: EmailTrackingMode | null | undefined
  profileEmail: string
  maskedEmail: string | null | undefined
  gmailConnected: boolean
}): ApplyIdentity {
  const mode: EmailTrackingMode = input.mode ?? 'off'

  if (mode === 'gmail') {
    const email = input.profileEmail.trim()
    const ready = Boolean(email && input.gmailConnected)
    return {
      mode,
      canCreateAccount: ready,
      canPollVerificationCode: ready,
      applyEmail: email || null,
      panelTitle: ready ? 'Create employer account with Gmail' : 'Connect Gmail to auto-create accounts',
      panelBody: ready
        ? 'HireIQ can register on this site with your Gmail, read the verification code from your inbox, and continue applying.'
        : 'Turn on Gmail tracking in Settings and connect Google so HireIQ can create accounts and read verification codes.',
      primaryAction: ready ? 'create-and-continue' : 'save-email-only',
    }
  }

  if (mode === 'masked') {
    const email = input.maskedEmail?.trim() || null
    return {
      mode,
      canCreateAccount: Boolean(email),
      canPollVerificationCode: Boolean(email),
      applyEmail: email,
      panelTitle: email ? 'Create employer account with masked email' : 'Set up masked apply email',
      panelBody: email
        ? 'HireIQ will register with your masked apply address, capture verification codes, and show portal login on the job timeline.'
        : 'Enable masked email tracking in Settings first.',
      primaryAction: email ? 'create-and-continue' : 'save-email-only',
    }
  }

  return {
    mode: 'off',
    canCreateAccount: false,
    canPollVerificationCode: false,
    applyEmail: input.profileEmail.trim() || null,
    panelTitle: 'Employer account needed',
    panelBody:
      'Email tracking is off, so HireIQ cannot create accounts or read verification codes. Autofill and Submit still work — create the account yourself if required.',
    primaryAction: 'autofill-only',
  }
}

/** Prefer the tracking-mode apply address on ATS forms (masked email when that mode is on). */
export function overlayApplyEmail<T extends { email: string }>(
  profile: T,
  applyEmail: string | null | undefined,
): T {
  const email = applyEmail?.trim()
  if (!email) return profile
  return { ...profile, email }
}
