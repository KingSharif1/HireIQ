import { describe, expect, it } from 'vitest'
import {
  AUTO_NA_ANSWER,
  isFollowUpQuestionLabel,
  isNegativeChoice,
  isYesNoChoices,
  pickChoiceByLabel,
} from '@/lib/extension/review-choices'

describe('review-choices', () => {
  it('detects Yes/No selects', () => {
    expect(
      isYesNoChoices([
        { value: '1', label: 'Yes' },
        { value: '0', label: 'No' },
      ]),
    ).toBe(true)
    expect(
      isYesNoChoices([
        { value: 'a', label: 'Remote' },
        { value: 'b', label: 'Hybrid' },
        { value: 'c', label: 'Onsite' },
      ]),
    ).toBe(false)
  })

  it('detects follow-up labels', () => {
    expect(isFollowUpQuestionLabel('If yes, please explain')).toBe(true)
    expect(isFollowUpQuestionLabel('Please describe')).toBe(true)
    expect(isFollowUpQuestionLabel('First Name')).toBe(false)
  })

  it('detects negative answers and picks choices', () => {
    expect(isNegativeChoice('No')).toBe(true)
    expect(isNegativeChoice('Yes')).toBe(false)
    expect(AUTO_NA_ANSWER).toBe('N/A')
    const hit = pickChoiceByLabel(
      [
        { value: '1', label: 'Yes' },
        { value: '0', label: 'No' },
      ],
      'no',
    )
    expect(hit?.value).toBe('0')
  })
})
