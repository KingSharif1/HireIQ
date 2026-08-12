import type { ApplicationFormAnswer } from '@/types'

export function upsertFormAnswer(
  existing: ApplicationFormAnswer[],
  entry: ApplicationFormAnswer,
): ApplicationFormAnswer[] {
  const idx = existing.findIndex(a => a.key === entry.key)
  if (idx === -1) return [...existing, entry]
  const next = [...existing]
  next[idx] = entry
  return next
}

export function removeFormAnswer(
  existing: ApplicationFormAnswer[],
  key: string,
): ApplicationFormAnswer[] {
  return existing.filter(a => a.key !== key)
}

export function normalizeFormAnswers(value: unknown): ApplicationFormAnswer[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is ApplicationFormAnswer =>
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as ApplicationFormAnswer).key === 'string' &&
      typeof (entry as ApplicationFormAnswer).question === 'string' &&
      typeof (entry as ApplicationFormAnswer).answer === 'string',
  )
}
