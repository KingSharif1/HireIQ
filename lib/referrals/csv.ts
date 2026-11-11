/**
 * Parse LinkedIn's "Connections" export (`Connections.csv` from
 * Settings → Data privacy → Get a copy of your data).
 *
 * Minimal RFC 4180 parser (quoted fields, commas/newlines inside quotes, BOM,
 * CRLF). No third-party CSV dependency.
 */

export interface LinkedInCsvRow {
  firstName: string
  lastName: string
  url: string
  email: string
  company: string
  position: string
  connectedOn: string
}

/** Minimal CSV → string[][] with quote handling. */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

export function parseLinkedInConnectionsCsv(text: string): LinkedInCsvRow[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h))

  const colFirst = idx(['first name', 'firstname'])
  const colLast = idx(['last name', 'lastname'])
  const colUrl = idx(['url', 'profile url', 'profileurl'])
  const colEmail = idx(['email address', 'email', 'emailaddress'])
  const colCompany = idx(['company', 'current company', 'employer'])
  const colPosition = idx(['position', 'title', 'job title'])
  const colConnectedOn = idx(['connected on', 'connectedon'])

  const out: LinkedInCsvRow[] = []
  for (const r of rows.slice(1)) {
    out.push({
      firstName: (r[colFirst] ?? '').trim(),
      lastName: (r[colLast] ?? '').trim(),
      url: (r[colUrl] ?? '').trim(),
      email: (r[colEmail] ?? '').trim(),
      company: (r[colCompany] ?? '').trim(),
      position: (r[colPosition] ?? '').trim(),
      connectedOn: (r[colConnectedOn] ?? '').trim(),
    })
  }
  return out.filter((r) => Boolean(r.firstName || r.lastName || r.url))
}

/** Stable dedupe key — URL preferred, else name. */
export function connectionKey(row: Pick<LinkedInCsvRow, 'url' | 'firstName' | 'lastName'>): string {
  const url = row.url.trim().toLowerCase()
  if (url) return url
  return `${row.firstName} ${row.lastName}`.trim().toLowerCase()
}
