import { describe, it, expect } from 'vitest'
import {
  changeTarget,
  ruleForDecision,
  mergeDraftedRules,
} from '@/lib/tailor/rule-from-diff'
import { defaultBlueprint } from '@/lib/profile/blueprint'
import type { ChangeDecision, ResumeDiffChange } from '@/types'

function change(overrides: Partial<ResumeDiffChange> = {}): ResumeDiffChange {
  return {
    section: 'experience',
    field: 'bullets',
    expId: 'exp1',
    before: ['Built X'],
    after: ['Architected X'],
    changeType: 'changed',
    ...overrides,
  }
}

function declined(code: ChangeDecision['declineReasonCode'] = 'prefer_original'): ChangeDecision {
  return { status: 'declined', declineReasonCode: code }
}

describe('changeTarget', () => {
  it('keys experience/project changes to their entry id', () => {
    expect(changeTarget(change({ expId: 'exp1' }))).toEqual({ id: 'exp1', section: 'experience' })
    expect(changeTarget(change({ section: 'projects', field: 'bullets', expId: undefined, projId: 'proj1' }))).toEqual({
      id: 'proj1',
      section: 'projects',
    })
  })

  it('keys summary/skills to their section', () => {
    expect(changeTarget(change({ section: 'summary', field: 'text', expId: undefined }))).toEqual({
      id: 'summary',
      section: 'summary',
    })
    expect(changeTarget(change({ section: 'skills', field: 'skills', expId: undefined }))).toEqual({
      id: 'skills',
      section: 'skills',
    })
  })
})

describe('ruleForDecision', () => {
  it('returns null for non-declined decisions', () => {
    expect(ruleForDecision(change(), { status: 'accepted' })).toBeNull()
    expect(ruleForDecision(change(), { status: 'edited', editedValue: 'X' })).toBeNull()
  })

  it('maps a reworded change to verbatim (keep original)', () => {
    expect(ruleForDecision(change(), declined('prefer_original'))).toEqual({
      id: 'exp1',
      section: 'experience',
      action: 'verbatim',
      label: 'Keep my original wording',
    })
  })

  it('maps a removed entry to tailored (always include)', () => {
    expect(ruleForDecision(change({ changeType: 'removed' }), declined())).toMatchObject({
      id: 'exp1',
      action: 'tailored',
    })
  })

  it('maps not_relevant to hidden', () => {
    expect(ruleForDecision(change(), declined('not_relevant'))).toMatchObject({
      action: 'hidden',
    })
  })

  it('returns null for AI-invented additions', () => {
    expect(ruleForDecision(change({ changeType: 'added' }), declined())).toBeNull()
  })
})

describe('mergeDraftedRules', () => {
  it('merges rules and moves hidden into hidden[]', () => {
    const bp = defaultBlueprint()
    const merged = mergeDraftedRules(bp, [
      { id: 'exp1', section: 'experience', action: 'verbatim', label: '' },
      { id: 'exp2', section: 'experience', action: 'hidden', label: '' },
    ])
    expect(merged.rules.exp1).toBe('verbatim')
    expect(merged.rules.exp2).toBeUndefined()
    expect(merged.hidden).toContain('exp2')
  })
})
