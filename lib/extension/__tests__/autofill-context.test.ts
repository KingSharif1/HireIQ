import { describe, expect, it } from 'vitest'
import { emptyProfileData } from '@/lib/profile/data'
import { extractKnownSensitiveFacts } from '@/lib/extension/autofill-context'

describe('extractKnownSensitiveFacts', () => {
  it('returns only application facts explicitly saved by the user', () => {
    const profile = emptyProfileData()
    profile.applyAnswers = {
      ...profile.applyAnswers!,
      country: 'United States',
      workAuthorizedUS: 'yes',
      requiresSponsorship: 'no',
      dateOfBirth: '2000-06-15',
      desiredSalaryMin: '70000',
      desiredSalaryMax: '115000',
      gender: 'non_binary',
      ethnicity: 'two_or_more',
      veteran: 'not_protected_veteran',
      disability: 'prefer_not',
    }

    expect(extractKnownSensitiveFacts(profile)).toEqual({
      country: 'United States',
      work_authorization: 'Authorized to work in the United States',
      sponsorship: 'No',
      date_of_birth: '2000-06-15',
      desired_salary: '$70000 to $115000 annual base salary',
      gender: 'Non-binary',
      race_ethnicity: 'Two or more races',
      veteran_status: 'I am not a protected veteran',
      disability_status: 'Prefer not to answer',
    })
  })
})
