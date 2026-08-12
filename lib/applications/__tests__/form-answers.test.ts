import { describe, expect, it } from 'vitest'
import {
  normalizeFormAnswers,
  removeFormAnswer,
  upsertFormAnswer,
} from '@/lib/applications/form-answers'
import type { ApplicationFormAnswer } from '@/types'

const sample: ApplicationFormAnswer = {
  key: 'work_auth',
  question: 'Are you authorized to work?',
  answer: 'Yes',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

describe('form-answers helpers', () => {
  it('upserts by key', () => {
    const updated = upsertFormAnswer([sample], {
      ...sample,
      answer: 'No',
      updatedAt: '2026-08-10T00:00:00.000Z',
    })
    expect(updated).toHaveLength(1)
    expect(updated[0]?.answer).toBe('No')
  })

  it('appends when key is new', () => {
    const next = upsertFormAnswer([sample], {
      key: 'salary',
      question: 'Expected salary?',
      answer: '120k',
      updatedAt: '2026-08-10T00:00:00.000Z',
    })
    expect(next).toHaveLength(2)
  })

  it('removes by key', () => {
    expect(removeFormAnswer([sample], 'work_auth')).toEqual([])
    expect(removeFormAnswer([sample], 'missing')).toEqual([sample])
  })

  it('normalizes junk input', () => {
    expect(normalizeFormAnswers(null)).toEqual([])
    expect(normalizeFormAnswers([{ key: 1 }])).toEqual([])
    expect(normalizeFormAnswers([sample])).toEqual([sample])
  })
})
