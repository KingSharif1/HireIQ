/**
 * Posting safety check. Job pages are untrusted input: before any AI reads a
 * posting, scan it for hidden text and lines that try to instruct the model.
 * Pure and fast; no network.
 */

export type SafetyFinding = {
  kind: 'tag-characters' | 'zero-width' | 'instruction' | 'hidden-markup'
  severity: 'block' | 'warn'
  detail: string
}

export type SafetyResult = {
  /** false when a block-level finding exists: do not feed this text to an agent. */
  safe: boolean
  findings: SafetyFinding[]
  /** Text with invisible characters removed (still untrusted). */
  cleanText: string
}

// Unicode "tag" characters can smuggle invisible instructions.
const TAG_CHARS = /[\u{E0000}-\u{E007F}]/gu
const ZERO_WIDTH = /[​-‏‪-‮⁠-⁩﻿]/g

const INSTRUCTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, label: 'ignore previous instructions' },
  { re: /disregard\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)/i, label: 'disregard previous' },
  { re: /\bif\s+you\s+are\s+(an?\s+)?(ai|llm|language\s+model|chatbot|bot|assistant)\b/i, label: 'addresses an AI reader' },
  { re: /\b(system\s+prompt|developer\s+message)\b/i, label: 'mentions system prompt' },
  { re: /\bas\s+an?\s+(ai|llm|language\s+model)\b/i, label: 'speaks to the model' },
  { re: /\b(do\s+not|don'?t)\s+(tell|inform|reveal\s+to)\s+the\s+(user|candidate|applicant)\b/i, label: 'asks to hide something from the user' },
  { re: /\b(rank|rate|score)\s+(this\s+)?(candidate|applicant|resume|application)\s+(as\s+)?(highly|the\s+best|10\s*\/\s*10|top)/i, label: 'tries to set the score' },
  { re: /\b(send|email|post|submit)\b[^.\n]{0,60}\b(password|credentials?|api\s*key|resume\s+data)\b/i, label: 'asks to send credentials or data' },
]

const HIDDEN_STYLE =
  /<([a-z][a-z0-9]*)\b[^>]*style=["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px)?\b|opacity\s*:\s*0\b|left\s*:\s*-\d{3,}px)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function scanPostingSafety(input: { text: string; html?: string }): SafetyResult {
  const findings: SafetyFinding[] = []
  const text = input.text ?? ''

  const tagCount = (text.match(TAG_CHARS) ?? []).length
  if (tagCount > 0) {
    findings.push({ kind: 'tag-characters', severity: 'block', detail: `${tagCount} invisible tag characters` })
  }

  const zwCount = (text.match(ZERO_WIDTH) ?? []).length
  if (zwCount >= 5) {
    findings.push({ kind: 'zero-width', severity: 'warn', detail: `${zwCount} zero-width or direction-control characters` })
  }

  const cleanText = text.replace(TAG_CHARS, '').replace(ZERO_WIDTH, '')

  for (const { re, label } of INSTRUCTION_PATTERNS) {
    if (re.test(cleanText)) {
      findings.push({ kind: 'instruction', severity: 'block', detail: label })
    }
  }

  if (input.html) {
    for (const m of input.html.matchAll(HIDDEN_STYLE)) {
      const hidden = stripTags(m[3] ?? '')
      if (hidden.length < 30) continue
      const looksLikeInstruction = INSTRUCTION_PATTERNS.some(p => p.re.test(hidden))
      findings.push({
        kind: 'hidden-markup',
        severity: looksLikeInstruction ? 'block' : 'warn',
        detail: `hidden element with ${hidden.length} characters of text`,
      })
    }
  }

  return {
    safe: !findings.some(f => f.severity === 'block'),
    findings,
    cleanText,
  }
}
