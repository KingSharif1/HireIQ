import { describe, expect, it } from 'vitest'
import { inferCountryFromLocation, matchChoiceLabel } from '@/lib/extension/location-country'

describe('inferCountryFromLocation', () => {
  it('maps US city + state', () => {
    expect(inferCountryFromLocation("Fort Worth, TX")).toBe('United States')
    expect(inferCountryFromLocation('Austin, Texas')).toBe('United States')
  })

  it('maps Canada / UK / explicit country', () => {
    expect(inferCountryFromLocation('Toronto, ON')).toBe('Canada')
    expect(inferCountryFromLocation('London, UK')).toBe('United Kingdom')
    expect(inferCountryFromLocation('Berlin, Germany')).toBe('Germany')
  })

  it('returns empty when unknown', () => {
    expect(inferCountryFromLocation('')).toBe('')
    expect(inferCountryFromLocation('Remote')).toBe('')
  })
})

describe('matchChoiceLabel', () => {
  const choices = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'GB', label: 'United Kingdom' },
  ]

  it('matches typed fragments', () => {
    expect(matchChoiceLabel('united', choices)?.label).toBe('United States')
    expect(matchChoiceLabel('can', choices)?.label).toBe('Canada')
    expect(matchChoiceLabel('nope', choices)).toBeNull()
  })
})
