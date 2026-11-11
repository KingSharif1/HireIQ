import type { ChangeDecision, ResumeBlueprint, ResumeDiffChange, ResumeRule } from '@/types'

/**
 * Turn a *declined* review decision into a durable blueprint rule, so the same
 * correction doesn't recur on every job. Mirrors Sprout's "react to a real
 * resume instead of configuring rules in the abstract".
 *
 * Pure helpers; the UI (TailorDiff `⋯` menu) and persistence are separate.
 */

export type DraftedRuleAction = ResumeRule | 'hidden'
export type RuleScope = 'this_resume' | 'blueprint'

export interface DraftedRule {
  /** Item id the rule keys on (entry id, or a section key like 'summary'). */
  id: string
  section: string
  action: DraftedRuleAction
  /** Short reason for the confirm dialog. */
  label: string
}

/** The master item a change row targets, or null when it can't be keyed. */
export function changeTarget(change: ResumeDiffChange): { id: string; section: string } | null {
  if (change.expId) return { id: change.expId, section: 'experience' }
  if (change.projId) return { id: change.projId, section: 'projects' }
  if (change.section === 'summary') return { id: 'summary', section: 'summary' }
  if (change.section === 'skills') return { id: 'skills', section: 'skills' }
  return null
}

/**
 * Suggested rule for a declined decision, or null when nothing durable can be
 * saved (accepted/edited, or an AI-invented entry with no master id).
 */
export function ruleForDecision(
  change: ResumeDiffChange,
  decision: ChangeDecision,
): DraftedRule | null {
  if (decision.status !== 'declined') return null
  const target = changeTarget(change)
  if (!target) return null

  // AI invented a new entry — reject at the artifact, nothing to key on the master.
  if (change.changeType === 'added') return null

  if (decision.declineReasonCode === 'not_relevant') {
    return { ...target, action: 'hidden', label: 'Hide this from resumes' }
  }

  if (change.changeType === 'removed') {
    return { ...target, action: 'tailored', label: 'Always include this' }
  }

  // Reword / rephrase / inaccurate / too-strong / prefer-original → lock the original wording.
  return { ...target, action: 'verbatim', label: 'Keep my original wording' }
}

/** Merge drafted rules into a blueprint (`hidden` moves into `hidden[]`). */
export function mergeDraftedRules(
  blueprint: ResumeBlueprint,
  drafts: DraftedRule[],
): ResumeBlueprint {
  const rules = { ...blueprint.rules }
  const hidden = new Set(blueprint.hidden)
  for (const d of drafts) {
    if (d.action === 'hidden') {
      delete rules[d.id]
      hidden.add(d.id)
    } else {
      hidden.delete(d.id)
      rules[d.id] = d.action
    }
  }
  return { ...blueprint, rules, hidden: [...hidden] }
}
