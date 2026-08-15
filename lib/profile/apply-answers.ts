import type { ApplicationFormAnswer, ProfileApplyAnswers, ProfileData, YesNoBlank } from '@/types'
import { upsertFormAnswer } from '@/lib/applications/form-answers'

export function emptyApplyAnswers(): ProfileApplyAnswers {
  return {
    country: '',
    workAuthorizedUS: '',
    requiresSponsorship: '',
    willingToRelocate: '',
    inOfficeOk: '',
    gender: '',
    ethnicity: '',
    veteran: '',
    disability: '',
    saved: [],
  }
}

export function normalizeApplyAnswers(value: unknown): ProfileApplyAnswers {
  const base = emptyApplyAnswers()
  if (!value || typeof value !== 'object') return base
  const raw = value as Partial<ProfileApplyAnswers>
  return {
    country: typeof raw.country === 'string' ? raw.country : '',
    workAuthorizedUS: (raw.workAuthorizedUS as YesNoBlank) || '',
    requiresSponsorship: (raw.requiresSponsorship as YesNoBlank) || '',
    willingToRelocate: (raw.willingToRelocate as YesNoBlank) || '',
    inOfficeOk: (raw.inOfficeOk as YesNoBlank) || '',
    gender: typeof raw.gender === 'string' ? raw.gender : '',
    ethnicity: typeof raw.ethnicity === 'string' ? raw.ethnicity : '',
    veteran: typeof raw.veteran === 'string' ? raw.veteran : '',
    disability: typeof raw.disability === 'string' ? raw.disability : '',
    saved: Array.isArray(raw.saved) ? raw.saved.filter(isSavedAnswer) : [],
  }
}

function isSavedAnswer(entry: unknown): entry is ApplicationFormAnswer {
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof (entry as ApplicationFormAnswer).key === 'string' &&
    typeof (entry as ApplicationFormAnswer).question === 'string' &&
    typeof (entry as ApplicationFormAnswer).answer === 'string'
  )
}

function yesNoFromAnswer(answer: string): YesNoBlank | null {
  const t = answer.trim().toLowerCase()
  if (!t) return null
  if (/^(yes|y|true|authorized)\b/.test(t) || /\byes\b/.test(t)) return 'yes'
  if (/^(no|n|false)\b/.test(t) || /\bno\b/.test(t)) return 'no'
  if (/prefer not|decline/.test(t)) return 'prefer_not'
  return null
}

function filledCount(answers: ProfileApplyAnswers): number {
  const structured = [
    answers.country,
    answers.workAuthorizedUS,
    answers.requiresSponsorship,
    answers.willingToRelocate,
    answers.inOfficeOk,
    answers.gender,
    answers.ethnicity,
    answers.veteran,
    answers.disability,
  ].filter(v => v.trim()).length
  return structured + answers.saved.length
}

export function applyAnswersFilledCount(data: ProfileData): number {
  return filledCount(normalizeApplyAnswers(data.applyAnswers))
}

/**
 * Fold a job-application Q&A into master apply answers for reuse.
 * Known legal/identity questions map to structured fields; everything else is saved as custom.
 */
export function rememberApplyAnswer(data: ProfileData, entry: ApplicationFormAnswer): ProfileData {
  const answers = normalizeApplyAnswers(data.applyAnswers)
  const q = entry.question.toLowerCase()
  const yn = yesNoFromAnswer(entry.answer)

  if (/sponsor/.test(q) && yn) {
    answers.requiresSponsorship = yn === 'prefer_not' ? '' : yn
  } else if (/authori[sz]ed to work|work authori|legally authori/.test(q) && yn) {
    answers.workAuthorizedUS = yn === 'prefer_not' ? '' : yn
  } else if (/relocat/.test(q) && yn) {
    answers.willingToRelocate = yn === 'prefer_not' ? '' : yn
  } else if (/in-?office|hybrid|five days|5 days|on-?site/.test(q) && yn) {
    answers.inOfficeOk = yn === 'prefer_not' ? '' : yn
  } else if (/\bgender\b|\bsex\b/.test(q)) {
    answers.gender = entry.answer.trim()
  } else if (/\brace\b|\bethnic/.test(q)) {
    answers.ethnicity = entry.answer.trim()
  } else if (/veteran/.test(q)) {
    answers.veteran = entry.answer.trim()
  } else if (/disabilit/.test(q)) {
    answers.disability = entry.answer.trim()
  } else if (/\bcountry\b/.test(q)) {
    answers.country = entry.answer.trim()
  } else {
    answers.saved = upsertFormAnswer(answers.saved, entry)
  }

  return { ...data, applyAnswers: answers }
}
