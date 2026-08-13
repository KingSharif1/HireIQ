/** Extract a one-time verification code from email subject/body text. */
export function extractVerificationCode(text: string): string | null {
  if (!text?.trim()) return null
  const normalized = text.replace(/\s+/g, ' ')

  const patterns = [
    /\b(?:code|verification|confirm(?:ation)?|otp|pin)\s*(?:is|:)?\s*([0-9]{4,8})\b/i,
    /\b([0-9]{6})\b(?=\s*(?:is your|for verification|to verify|expires))/i,
    /\benter\s*(?:the\s*)?(?:code\s*)?([0-9]{4,8})\b/i,
    /\b([0-9]{6})\b/,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    const code = match?.[1]
    if (code && /^[0-9]{4,8}$/.test(code)) return code
  }

  return null
}
