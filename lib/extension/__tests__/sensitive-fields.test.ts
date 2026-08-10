import { describe, expect, it } from 'vitest'
import { isSensitiveFieldLabel } from '@/lib/extension/sensitive-fields'

describe('isSensitiveFieldLabel', () => {
  it('flags EEOC / demographic labels', () => {
    expect(isSensitiveFieldLabel('Race / Ethnicity')).toBe(true)
    expect(isSensitiveFieldLabel('Gender identity')).toBe(true)
    expect(isSensitiveFieldLabel('Sex')).toBe(true)
    expect(isSensitiveFieldLabel('Veteran status')).toBe(true)
    expect(isSensitiveFieldLabel('Disability')).toBe(true)
    expect(isSensitiveFieldLabel('LGBTQ+')).toBe(true)
    expect(isSensitiveFieldLabel('Religion')).toBe(true)
  })

  it('flags conviction, salary, work-auth, identity', () => {
    expect(isSensitiveFieldLabel('Have you been convicted of a crime?')).toBe(true)
    expect(isSensitiveFieldLabel('Criminal history')).toBe(true)
    expect(isSensitiveFieldLabel('Expected salary')).toBe(true)
    expect(isSensitiveFieldLabel('Compensation expectations')).toBe(true)
    expect(isSensitiveFieldLabel('Hourly wage')).toBe(true)
    expect(isSensitiveFieldLabel('Are you authorized to work in the US?')).toBe(true)
    expect(isSensitiveFieldLabel('Work authorization')).toBe(true)
    expect(isSensitiveFieldLabel('Do you require visa sponsorship?')).toBe(true)
    expect(isSensitiveFieldLabel('Citizenship')).toBe(true)
    expect(isSensitiveFieldLabel('SSN')).toBe(true)
    expect(isSensitiveFieldLabel('Social Security Number')).toBe(true)
    expect(isSensitiveFieldLabel('Date of Birth')).toBe(true)
    expect(isSensitiveFieldLabel('DOB')).toBe(true)
    expect(isSensitiveFieldLabel('Age')).toBe(true)
  })

  it('does not flag ordinary contact / skills fields', () => {
    expect(isSensitiveFieldLabel('First Name')).toBe(false)
    expect(isSensitiveFieldLabel('LinkedIn Profile')).toBe(false)
    expect(isSensitiveFieldLabel('Years of experience')).toBe(false)
    expect(isSensitiveFieldLabel('Why do you want this role?')).toBe(false)
    expect(isSensitiveFieldLabel('')).toBe(false)
  })
})
