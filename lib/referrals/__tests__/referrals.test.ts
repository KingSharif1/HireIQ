import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  parseLinkedInConnectionsCsv,
  connectionKey,
} from '@/lib/referrals/csv'
import {
  canTransitionReferral,
  isTerminalReferralStage,
  referralStageLabel,
} from '@/lib/referrals/stages'

const SAMPLE = [
  'First Name,Last Name,URL,Email Address,Company,Position,Connected On',
  'Ada,Lovelace,https://www.linkedin.com/in/ada-lovelace,ada@example.com,Acme Corp,Staff Engineer,12 Jan 2020',
  '"Grace","Hopper",https://www.linkedin.com/in/grace-hopper,,Globex,"Rear Admiral, USN",3 Mar 2021',
  '"With, Comma","Person",,,Acme,PM,',
].join('\n')

describe('parseCsv', () => {
  it('splits quoted commas correctly', () => {
    const rows = parseCsv('a,"b,c",d\n1,2,3')
    expect(rows).toEqual([
      ['a', 'b,c', 'd'],
      ['1', '2', '3'],
    ])
  })
})

describe('parseLinkedInConnectionsCsv', () => {
  it('maps LinkedIn headers and handles quoted fields', () => {
    const rows = parseLinkedInConnectionsCsv(SAMPLE)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      url: 'https://www.linkedin.com/in/ada-lovelace',
      email: 'ada@example.com',
      company: 'Acme Corp',
      position: 'Staff Engineer',
    })
    // Quoted comma inside a field survives.
    expect(rows[1].position).toBe('Rear Admiral, USN')
    // Missing trailing columns default to ''.
    expect(rows[2].email).toBe('')
  })
})

describe('connectionKey', () => {
  it('prefers URL then falls back to name', () => {
    expect(connectionKey({ url: 'HTTPS://linkedin.com/in/A', firstName: 'x', lastName: 'y' })).toBe(
      'https://linkedin.com/in/a',
    )
    expect(connectionKey({ url: '', firstName: 'Ada', lastName: 'Lovelace' })).toBe('ada lovelace')
  })
})

describe('referral stages', () => {
  it('encodes legal transitions', () => {
    expect(canTransitionReferral('drafting', 'intro_asked')).toBe(true)
    expect(canTransitionReferral('intro_asked', 'referred')).toBe(true)
    expect(canTransitionReferral('replied', 'referred')).toBe(true)
    expect(canTransitionReferral('no_response', 'intro_asked')).toBe(true)
    expect(canTransitionReferral('referred', 'declined')).toBe(false)
    expect(canTransitionReferral('drafting', 'referred')).toBe(false)
  })

  it('marks terminal stages', () => {
    expect(isTerminalReferralStage('referred')).toBe(true)
    expect(isTerminalReferralStage('declined')).toBe(true)
    expect(isTerminalReferralStage('intro_asked')).toBe(false)
  })

  it('labels stages', () => {
    expect(referralStageLabel('no_response')).toBe('No response')
  })
})
