/** Heuristic: entry-level / new-grad / internship roles. */
export function isEntryLevelRole(title: string, description = ''): boolean {
  const blob = `${title}\n${description}`.toLowerCase()
  if (!blob.trim()) return false
  // Senior signals win
  if (/\b(senior|staff|principal|lead|director|manager|architect)\b/.test(blob) && !/\bintern/.test(blob)) {
    return false
  }
  return (
    /\bintern(ship)?\b/.test(blob) ||
    /\bnew\s*grad(uate)?s?\b/.test(blob) ||
    /\brecent\s+grad(uate)?s?\b/.test(blob) ||
    /\bentry[-\s]?level\b/.test(blob) ||
    /\bjunior\b/.test(blob) ||
    /\bapprentice\b/.test(blob) ||
    /\buniversity\s+grad/.test(blob) ||
    /\b0\s*[-–to]+\s*2\s*years?\b/.test(blob) ||
    /\bco-?op\b/.test(blob)
  )
}
