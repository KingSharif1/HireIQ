export function generatePortalPassword(length = 16): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

function setInputValue(el: HTMLInputElement, value: string) {
  el.focus()
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

export function fillSignupForm(
  doc: Document,
  identity: { email: string; firstName: string; lastName: string; password: string },
): string[] {
  const filled: string[] = []

  const emailSelectors = [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[autocomplete="email"]',
  ]
  const passwordInputs = Array.from(doc.querySelectorAll('input[type="password"]')) as HTMLInputElement[]
  const firstSelectors = ['input[name*="first" i]', 'input[id*="first" i]', 'input[autocomplete="given-name"]']
  const lastSelectors = ['input[name*="last" i]', 'input[id*="last" i]', 'input[autocomplete="family-name"]']

  for (const sel of emailSelectors) {
    const el = doc.querySelector(sel)
    if (el instanceof HTMLInputElement && !el.value.trim()) {
      setInputValue(el, identity.email)
      filled.push('email')
      break
    }
  }

  for (const sel of firstSelectors) {
    const el = doc.querySelector(sel)
    if (el instanceof HTMLInputElement && !el.value.trim()) {
      setInputValue(el, identity.firstName)
      filled.push('firstName')
      break
    }
  }

  for (const sel of lastSelectors) {
    const el = doc.querySelector(sel)
    if (el instanceof HTMLInputElement && !el.value.trim()) {
      setInputValue(el, identity.lastName)
      filled.push('lastName')
      break
    }
  }

  if (passwordInputs.length > 0 && !passwordInputs[0]!.value.trim()) {
    setInputValue(passwordInputs[0]!, identity.password)
    filled.push('password')
  }
  if (passwordInputs.length > 1 && !passwordInputs[1]!.value.trim()) {
    setInputValue(passwordInputs[1]!, identity.password)
    filled.push('confirmPassword')
  }

  return filled
}

export function fillVerificationCode(doc: Document, code: string): boolean {
  const selectors = [
    'input[name*="code" i]',
    'input[id*="code" i]',
    'input[name*="otp" i]',
    'input[autocomplete="one-time-code"]',
    'input[inputmode="numeric"]',
  ]

  for (const sel of selectors) {
    const el = doc.querySelector(sel)
    if (el instanceof HTMLInputElement) {
      setInputValue(el, code)
      return true
    }
  }

  const digitInputs = Array.from(doc.querySelectorAll('input[maxlength="1"]')) as HTMLInputElement[]
  if (digitInputs.length >= 4 && digitInputs.length <= 8) {
    for (let i = 0; i < Math.min(code.length, digitInputs.length); i++) {
      setInputValue(digitInputs[i]!, code[i]!)
    }
    return true
  }

  return false
}
