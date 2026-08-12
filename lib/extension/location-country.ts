/**
 * Infer ISO-ish country name from a free-form location string
 * (e.g. "Fort Worth, TX" → "United States").
 */
const US_STATES =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i

const US_STATE_NAMES =
  /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\b/i

const CA_PROVINCES =
  /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|ontario|quebec|british columbia|alberta|manitoba|saskatchewan)\b/i

export function inferCountryFromLocation(location: string | null | undefined): string {
  const text = (location || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''

  if (/\bunited states\b|\busa\b|\bu\.s\.a\.?\b|\bu\.s\.\b/i.test(text)) return 'United States'
  if (/\bunited kingdom\b|\bengland\b|\bscotland\b|\bwales\b|\buk\b/i.test(text)) return 'United Kingdom'
  if (/\bcanada\b/i.test(text) || CA_PROVINCES.test(text)) return 'Canada'
  if (/\baustralia\b|\bnsw\b|\bvictoria\b|\bqld\b/i.test(text)) return 'Australia'
  if (/\bgermany\b|\bdeutschland\b/i.test(text)) return 'Germany'
  if (/\bindia\b/i.test(text)) return 'India'
  if (/\bmexico\b|\bméxico\b/i.test(text)) return 'Mexico'

  // City, ST pattern (US)
  if (US_STATES.test(text) || US_STATE_NAMES.test(text)) return 'United States'

  // Trailing country-ish token
  const parts = text.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!
    if (/^[A-Za-z .'-]{3,40}$/.test(last) && !US_STATES.test(last)) {
      // e.g. "Paris, France"
      if (!/^\d/.test(last)) return last
    }
  }

  return ''
}

/** Best option label matching typed text (exact → startsWith → includes). */
export function matchChoiceLabel(
  typed: string,
  choices: readonly { value: string; label: string }[],
): { value: string; label: string } | null {
  const q = typed.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!q || !choices.length) return null
  const exact =
    choices.find(c => c.label.toLowerCase() === q || c.value.toLowerCase() === q) || null
  if (exact) return exact
  const starts =
    choices.find(
      c => c.label.toLowerCase().startsWith(q) || c.value.toLowerCase().startsWith(q),
    ) || null
  if (starts) return starts
  return (
    choices.find(
      c => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q),
    ) || null
  )
}
