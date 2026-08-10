import { describe, expect, it } from 'vitest'
import {
  classifyField,
  valueForKind,
  isSensitiveFieldLabel,
  type AutofillProfile,
} from '@/lib/extension/form-fill'

const profile: AutofillProfile = {
  firstName: 'Sharif',
  lastName: 'Ahmed',
  preferredName: 'Sharif',
  email: 'sharif@example.com',
  phone: '(214) 555-0100',
  linkedin: 'https://www.linkedin.com/in/king-sharif',
  website: 'https://kingsharif.com/',
  country: 'United States',
  howHeard: 'LinkedIn',
}

describe('classifyField', () => {
  it('maps Greenhouse-style contact fields', () => {
    expect(
      classifyField({ name: 'first_name', id: '', type: 'text', label: 'First Name*', placeholder: '', autocomplete: '' }),
    ).toBe('first_name')
    expect(
      classifyField({ name: 'last_name', id: '', type: 'text', label: 'Last Name*', placeholder: '', autocomplete: '' }),
    ).toBe('last_name')
    expect(
      classifyField({ name: 'email', id: '', type: 'text', label: 'Email*', placeholder: '', autocomplete: '' }),
    ).toBe('email')
    expect(
      classifyField({ name: 'phone', id: '', type: 'tel', label: 'Phone', placeholder: '', autocomplete: '' }),
    ).toBe('phone')
  })

  it('maps LinkedIn / website / how heard', () => {
    expect(
      classifyField({
        name: 'question_1',
        id: '',
        type: 'text',
        label: 'LinkedIn Profile',
        placeholder: '',
        autocomplete: '',
      }),
    ).toBe('linkedin')
    expect(
      classifyField({
        name: 'question_2',
        id: '',
        type: 'text',
        label: 'Website',
        placeholder: '',
        autocomplete: '',
      }),
    ).toBe('website')
    expect(
      classifyField({
        name: 'question_3',
        id: '',
        type: 'text',
        label: 'How did you hear about this position?*',
        placeholder: '',
        autocomplete: '',
      }),
    ).toBe('how_heard')
  })

  it('skips file and password fields', () => {
    expect(
      classifyField({ name: 'resume', id: '', type: 'file', label: 'Attach', placeholder: '', autocomplete: '' }),
    ).toBe('skip')
    expect(
      classifyField({ name: 'password', id: '', type: 'password', label: 'Password', placeholder: '', autocomplete: '' }),
    ).toBe('skip')
  })
})

describe('valueForKind', () => {
  it('returns profile values for known kinds', () => {
    expect(valueForKind('first_name', profile)).toBe('Sharif')
    expect(valueForKind('linkedin', profile)).toBe('https://www.linkedin.com/in/king-sharif')
    expect(valueForKind('how_heard', profile)).toBe('LinkedIn')
    expect(valueForKind('unknown', profile)).toBeNull()
  })
})

describe('isSensitiveFieldLabel', () => {
  it('flags EEOC / salary / conviction / work auth', () => {
    expect(isSensitiveFieldLabel('Race / Ethnicity')).toBe(true)
    expect(isSensitiveFieldLabel('Gender identity')).toBe(true)
    expect(isSensitiveFieldLabel('Veteran status')).toBe(true)
    expect(isSensitiveFieldLabel('Do you have a disability?')).toBe(true)
    expect(isSensitiveFieldLabel('Desired salary')).toBe(true)
    expect(isSensitiveFieldLabel('Criminal conviction history')).toBe(true)
    expect(isSensitiveFieldLabel('Are you authorized to work in the US?')).toBe(true)
  })

  it('allows normal screening questions', () => {
    expect(isSensitiveFieldLabel('Why do you want this role?')).toBe(false)
    expect(isSensitiveFieldLabel('Years of React experience')).toBe(false)
  })
})
