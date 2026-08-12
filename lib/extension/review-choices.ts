/**
 * Pure helpers for extension review UX: closed choices + follow-up N/A.
 */

export type ChoiceOption = {
  value: string
  label: string
}

export function normalizeChoiceLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** True when options are essentially Yes/No (optional Prefer not to say, etc.). */
export function isYesNoChoices(choices: readonly ChoiceOption[]): boolean {
  if (choices.length < 2 || choices.length > 5) return false
  const labels = choices.map(c => normalizeChoiceLabel(c.label || c.value))
  const hasYes = labels.some(l => /^(yes|y)$/.test(l) || l === 'true')
  const hasNo = labels.some(l => /^(no|n)$/.test(l) || l === 'false')
  return hasYes && hasNo
}

/** Follow-up prompts that become irrelevant after answering No. */
export function isFollowUpQuestionLabel(label: string): boolean {
  const l = normalizeChoiceLabel(label)
  if (!l) return false
  return (
    /\bif\s+yes\b/.test(l) ||
    /\bif\s+so\b/.test(l) ||
    /\bplease\s+(explain|describe|specify|elaborate|provide)\b/.test(l) ||
    /\bexplain\b/.test(l) ||
    /\badditional\s+(details?|info|information|comments?)\b/.test(l) ||
    /\bcomments?\b/.test(l) ||
    /\bdetails?\b/.test(l) ||
    /\bwhy\b/.test(l) ||
    /\bdescribe\b/.test(l)
  )
}

export function isNegativeChoice(answer: string): boolean {
  const a = normalizeChoiceLabel(answer)
  return /^(no|n|false|none|not applicable|n\/a)$/.test(a)
}

export function pickChoiceByLabel(
  choices: readonly ChoiceOption[],
  wanted: string,
): ChoiceOption | null {
  const w = normalizeChoiceLabel(wanted)
  return (
    choices.find(c => normalizeChoiceLabel(c.label) === w) ||
    choices.find(c => normalizeChoiceLabel(c.value) === w) ||
    choices.find(c => normalizeChoiceLabel(c.label).startsWith(w)) ||
    null
  )
}

export const AUTO_NA_ANSWER = 'N/A'
