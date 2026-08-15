/** Pull the first JSON object/array out of model text (fences or leading prose). */
export function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  const body = (fence ? fence[1] : text).trim()
  const objStart = body.indexOf('{')
  const arrStart = body.indexOf('[')
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart)
  if (start === -1) return body
  const fromStart = body.slice(start)
  const { balancedEnd } = scanJson(fromStart)
  if (balancedEnd != null) return fromStart.slice(0, balancedEnd + 1)
  return fromStart
}

function scanJson(s: string): { balancedEnd: number | null; stack: string[]; inString: boolean } {
  let inString = false
  let escape = false
  const stack: string[] = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') {
      if (stack[stack.length - 1] === ch) stack.pop()
      if (stack.length === 0) return { balancedEnd: i, stack, inString: false }
    }
  }
  return { balancedEnd: null, stack, inString }
}

function closeTruncatedJson(raw: string): string {
  let out = raw.trim()
  const scan = scanJson(out)
  if (scan.inString) out += '"'
  out = out.replace(/,\s*$/, '')
  const after = scanJson(out)
  let closed = out
  for (let i = after.stack.length - 1; i >= 0; i--) closed += after.stack[i]
  return closed
}

function repairJson(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    // Missing commas between adjacent JSON values (common model slip in long arrays)
    .replace(/\}\s*\{/g, '},{')
    .replace(/\]\s*\[/g, '],[')
    .replace(/("(?:\\.|[^"\\])*")\s*(")/g, '$1,$2')
    .replace(/(\d+(?:\.\d+)?)\s*(")/g, '$1,$2')
    .replace(/("(?:\\.|[^"\\])*")\s*\{/g, '$1,{')
    .replace(/\}\s*(")/g, '},$1')
    .replace(/(\d+(?:\.\d+)?)\s*\{/g, '$1,{')
    .replace(/true\s*(")/gi, 'true,$1')
    .replace(/false\s*(")/gi, 'false,$1')
    .replace(/null\s*(")/gi, 'null,$1')
    .replace(/,\s*([}\]])/g, '$1')
}

/** Parse model JSON. Balanced extract, trailing-comma / smart-quote repair, then close truncated trees. */
export function parseModelJson<T>(text: string): T {
  const extracted = extractJSON(text)
  const candidates = [
    extracted,
    repairJson(extracted),
    closeTruncatedJson(extracted),
    closeTruncatedJson(repairJson(extracted)),
  ]
  let lastErr: unknown
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Invalid JSON from model')
}
