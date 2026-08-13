import { describe, expect, it } from 'vitest'
import {
  classifyBoardField,
  detectBoard,
  distinctiveContinueSelectors,
  distinctiveResumeSelectors,
  distinctiveSubmitSelectors,
} from '@/lib/extension/board'
import { classifyField, valueForKind, type AutofillProfile } from '@/lib/extension/form-fill'

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

describe('detectBoard', () => {
  it('maps known ATS hosts', () => {
    expect(detectBoard('boards.greenhouse.io')).toBe('greenhouse')
    expect(detectBoard('job-boards.greenhouse.io')).toBe('greenhouse')
    expect(detectBoard('jobs.lever.co')).toBe('lever')
    expect(detectBoard('jobs.ashbyhq.com')).toBe('ashby')
    expect(detectBoard('acme.wd5.myworkdayjobs.com')).toBe('workday')
    expect(detectBoard('careers.example.com')).toBe('generic')
  })
})

describe('classifyBoardField', () => {
  it('maps Greenhouse first/last name attrs', () => {
    expect(classifyBoardField({ name: 'first_name', id: '' })).toBe('first_name')
    expect(classifyBoardField({ name: 'job_application[email]', id: '' })).toBe('email')
  })

  it('maps Lever URL fields and full name on Lever boards', () => {
    expect(classifyBoardField({ name: 'urls[LinkedIn]', id: '' })).toBe('linkedin')
    expect(classifyBoardField({ name: 'urls[GitHub]', id: '' })).toBe('website')
    expect(classifyBoardField({ name: 'name', id: '' }, 'lever')).toBe('full_name')
    expect(classifyBoardField({ name: 'name', id: '' }, 'generic')).toBeNull()
  })

  it('maps Ashby system fields and Workday automation ids', () => {
    expect(classifyBoardField({ name: '_systemfield_email', id: '' })).toBe('email')
    expect(classifyBoardField({ name: '_systemfield_name', id: '' })).toBe('full_name')
    expect(
      classifyBoardField({
        name: '',
        id: '',
        automationId: 'legalNameSection_firstName',
      }),
    ).toBe('first_name')
    expect(
      classifyBoardField({ name: '', id: '', automationId: 'linkedinQuestion' }),
    ).toBe('linkedin')
  })
})

describe('classifyField with board', () => {
  it('fills Lever full name from first + last', () => {
    expect(
      classifyField(
        { name: 'name', id: '', type: 'text', label: 'Full name', placeholder: '', autocomplete: '' },
        { board: 'lever' },
      ),
    ).toBe('full_name')
    expect(valueForKind('full_name', profile)).toBe('Sharif Ahmed')
  })

  it('maps Workday automation ids through classifyField', () => {
    expect(
      classifyField({
        name: '',
        id: '',
        type: 'text',
        label: '',
        placeholder: '',
        autocomplete: '',
        automationId: 'legalNameSection_lastName',
      }),
    ).toBe('last_name')
  })
})

describe('distinctive selectors', () => {
  it('includes Greenhouse submit, Workday continue, and resume inputs', () => {
    expect(distinctiveSubmitSelectors().some(s => s.includes('submit_app'))).toBe(true)
    expect(distinctiveContinueSelectors().some(s => s.includes('bottom-navigation-next-button'))).toBe(true)
    expect(distinctiveResumeSelectors().some(s => s.includes('file-upload-input-ref'))).toBe(true)
  })
})
