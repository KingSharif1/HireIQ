/**
 * Level shown on the job ("Level: …") and fed to the tailor length budget.
 * The analyzer sometimes labels new-grad / early-career roles as intern.
 * Internship language in the title wins; otherwise new-grad language wins
 * over a soft intern/junior/empty label.
 */

const INTERN_RE = /\bintern(?:ship|s)?\b/i
const NEW_GRAD_RE =
  /\b(?:new[\s-]?grad(?:uate)?s?|recent[\s-]?grad(?:uate)?s?|early[\s-]career|university hire|campus (?:hire|recruit(?:ing)?)|entry[\s-]level)\b/i

const NEW_GRAD_ALIASES = new Set([
  'new_grad',
  'newgrad',
  'new_graduate',
  'early_career',
  'entry_level',
])

export function resolveSeniority(input: {
  seniority?: string | null
  title?: string | null
  summary?: string | null
  description?: string | null
}): string {
  const raw = (input.seniority ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const canonical = NEW_GRAD_ALIASES.has(raw)
    ? 'new_grad'
    : raw === 'internship'
      ? 'intern'
      : raw

  const title = input.title ?? ''
  const body = `${input.summary ?? ''}\n${input.description ?? ''}`
  const titleIntern = INTERN_RE.test(title)
  const titleNewGrad = NEW_GRAD_RE.test(title)
  const bodyIntern = INTERN_RE.test(body)
  const bodyNewGrad = NEW_GRAD_RE.test(body)

  if (titleIntern && !titleNewGrad) return 'intern'
  if (titleNewGrad && !titleIntern) return 'new_grad'

  const soft =
    canonical === '' || canonical === 'intern' || canonical === 'junior' || canonical === 'entry'
  if (soft && bodyNewGrad && !bodyIntern) return 'new_grad'
  if (
    (canonical === '' || canonical === 'new_grad' || canonical === 'junior') &&
    bodyIntern &&
    !bodyNewGrad
  ) {
    return 'intern'
  }
  return canonical
}
