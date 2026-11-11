import type {
  ResumeBlueprint,
  ResumeRule,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  StructuredResume,
} from '@/types'
import { bulletIdFor, isHidden, ruleFor } from '@/lib/profile/blueprint'

/**
 * Deterministic post-generation enforcement of the blueprint. The model's
 * rewrite is a suggestion; this pass makes the rules guarantees:
 *
 * - `verbatim` entries/bullets: restored byte-for-byte, re-inserted if dropped.
 * - `tailored` entries/bullets: re-inserted if dropped, wording may change.
 * - hidden entries/bullets: stripped even if the model re-added them.
 * - `aiChooses: false`: every non-hidden item from the profile is re-inserted.
 *
 * Pure function — no I/O, no extra AI calls (fits the ≤2 Claude-call ceiling).
 */

export type EnforceViolationKind =
  | 'reinserted_entry'
  | 'reinserted_bullet'
  | 'restored_verbatim'
  | 'removed_hidden'

export interface EnforceViolation {
  kind: EnforceViolationKind
  section: string
  entryId?: string
  bulletId?: string
}

export interface EnforceResult {
  resume: StructuredResume
  violations: EnforceViolation[]
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

function effectiveBulletRule(
  blueprint: ResumeBlueprint,
  sectionKey: string,
  entryId: string,
  bulletId: string,
  entryRule: ResumeRule,
): ResumeRule {
  // Parent wins: a verbatim entry locks its bullets; a hidden entry hides them.
  if (entryRule === 'verbatim') return 'verbatim'
  return blueprint.rules[bulletId] ?? blueprint.rules[entryId] ?? blueprint.rules[sectionKey] ?? 'auto'
}

/** Index of a matching bullet in the draft entry, or -1. */
function findBulletIndex(
  entry: { bullets: string[]; bulletIds?: string[] },
  id: string,
  text: string,
): number {
  const ids = entry.bulletIds
  if (ids) {
    const byId = ids.indexOf(id)
    if (byId >= 0) return byId
  }
  const nt = normalize(text)
  const exact = entry.bullets.findIndex((b) => normalize(b) === nt)
  if (exact >= 0) return exact
  const prefix = nt.slice(0, 40)
  if (prefix.length >= 12) {
    return entry.bullets.findIndex((b) => normalize(b).slice(0, 40) === prefix)
  }
  return -1
}

function enforceEntryList(
  original: Array<ResumeExperience | ResumeProject>,
  draft: Array<ResumeExperience | ResumeProject>,
  sectionKey: string,
  blueprint: ResumeBlueprint,
  violations: EnforceViolation[],
): Array<ResumeExperience | ResumeProject> {
  const out = draft.map((e) => ({ ...e, bullets: [...e.bullets] }))
  const sectionRule = ruleFor(blueprint, sectionKey)

  for (const orig of original) {
    const entryId = orig.id
    const entryRule = ruleFor(blueprint, entryId) === 'auto' ? sectionRule : ruleFor(blueprint, entryId)
    const hiddenEntry = isHidden(blueprint, entryId) || isHidden(blueprint, sectionKey)

    if (hiddenEntry) {
      const idx = out.findIndex((e) => e.id === entryId)
      if (idx >= 0) {
        out.splice(idx, 1)
        violations.push({ kind: 'removed_hidden', section: sectionKey, entryId })
      }
      continue
    }

    const mustKeep = entryRule !== 'auto' || !blueprint.aiChooses

    let draftIdx = out.findIndex((e) => e.id === entryId)
    if (draftIdx < 0) {
      if (mustKeep) {
        out.push(structuredClone(orig))
        violations.push({ kind: 'reinserted_entry', section: sectionKey, entryId })
      }
      continue
    }

    const draftEntry = out[draftIdx]

    // Entry-level verbatim: restore title/company/dates + bullets exactly.
    if (entryRule === 'verbatim') {
      const restored = structuredClone(orig)
      restored.bulletIds = orig.bulletIds ?? draftEntry.bulletIds
      if (
        normalize(draftEntry.bullets.join('\n')) !== normalize(orig.bullets.join('\n'))
      ) {
        violations.push({ kind: 'restored_verbatim', section: sectionKey, entryId })
      }
      out[draftIdx] = restored
      continue
    }

    // Bullet-level reconciliation.
    const draftBullets = [...draftEntry.bullets]
    const draftBulletIds = draftEntry.bulletIds ? [...draftEntry.bulletIds] : undefined

    // Strip hidden bullets.
    for (let i = draftBullets.length - 1; i >= 0; i--) {
      const id = bulletIdFor({ id: entryId, bulletIds: draftBulletIds }, i)
      if (isHidden(blueprint, id)) {
        draftBullets.splice(i, 1)
        draftBulletIds?.splice(i, 1)
        violations.push({ kind: 'removed_hidden', section: sectionKey, entryId, bulletId: id })
      }
    }

    const working = { bullets: draftBullets, bulletIds: draftBulletIds }

    orig.bullets.forEach((text, i) => {
      const id = bulletIdFor(orig, i)
      const bRule = effectiveBulletRule(blueprint, sectionKey, entryId, id, entryRule)
      const idx = findBulletIndex(working, id, text)
      const bMustKeep = bRule !== 'auto' || !blueprint.aiChooses

      if (idx < 0) {
        if (bMustKeep) {
          working.bullets.push(text)
          working.bulletIds?.push(id)
          violations.push({ kind: 'reinserted_bullet', section: sectionKey, entryId, bulletId: id })
        }
        return
      }

      if (bRule === 'verbatim' && normalize(working.bullets[idx]) !== normalize(text)) {
        working.bullets[idx] = text
        violations.push({ kind: 'restored_verbatim', section: sectionKey, entryId, bulletId: id })
      }
    })

    draftEntry.bullets = working.bullets
    if (working.bulletIds) draftEntry.bulletIds = working.bulletIds
  }

  // Apply manual ordering if the user set one for this section.
  const order = blueprint.order[sectionKey]
  if (order && order.length) {
    const byId = new Map(out.map((e) => [e.id, e]))
    const ordered: Array<ResumeExperience | ResumeProject> = []
    for (const id of order) {
      const e = byId.get(id)
      if (e) {
        ordered.push(e)
        byId.delete(id)
      }
    }
    out.length = 0
    out.push(...ordered, ...byId.values())
  }

  return out
}

export function enforceBlueprint(
  original: StructuredResume,
  draft: StructuredResume,
  blueprint: ResumeBlueprint,
): EnforceResult {
  const result: StructuredResume = structuredClone(draft)
  const violations: EnforceViolation[] = []

  // Field-level verbatim (title + summary).
  if (ruleFor(blueprint, 'title') === 'verbatim' && result.contact) {
    if (normalize(result.contact.name ?? '') !== normalize(original.contact?.name ?? '')) {
      result.contact = { ...result.contact, name: original.contact?.name, title: original.contact?.title }
      violations.push({ kind: 'restored_verbatim', section: 'title' })
    }
  }
  if (ruleFor(blueprint, 'summary') === 'verbatim') {
    if (normalize(result.summary ?? '') !== normalize(original.summary ?? '')) {
      result.summary = original.summary
      violations.push({ kind: 'restored_verbatim', section: 'summary' })
    }
  }

  result.experience = enforceEntryList(
    original.experience ?? [],
    result.experience ?? [],
    'experience',
    blueprint,
    violations,
  ) as ResumeExperience[]

  result.projects = enforceEntryList(
    original.projects ?? [],
    result.projects ?? [],
    'projects',
    blueprint,
    violations,
  ) as ResumeProject[]

  // Education: entries only (no bullets).
  const eduRule = ruleFor(blueprint, 'education')
  const eduOrder = blueprint.order.education ?? []
  const kept = (result.education ?? []).filter(
    (e) => !isHidden(blueprint, e.id) && !isHidden(blueprint, 'education'),
  )
  for (const orig of original.education ?? []) {
    if (isHidden(blueprint, orig.id)) continue
    const mustKeep = ruleFor(blueprint, orig.id) !== 'auto' || eduRule !== 'auto' || !blueprint.aiChooses
    if (mustKeep && !kept.some((e) => e.id === orig.id)) {
      kept.push(structuredClone(orig as ResumeEducation))
      violations.push({ kind: 'reinserted_entry', section: 'education', entryId: orig.id })
    }
  }
  result.education = kept

  return { resume: result, violations }
}
