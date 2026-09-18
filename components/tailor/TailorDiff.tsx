'use client'

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getChangeId, setAllDecisions } from '@/lib/tailor/change-decisions'
import { scoreImpactForChange } from '@/lib/scoring/tailored-rescore'
import type {
  ChangeDecision,
  JobExtractedData,
  ResumeDiffChange,
  StructuredResume,
} from '@/types'
import { Check, X, Pencil, RotateCcw, ChevronDown } from 'lucide-react'

interface TailorDiffProps {
  original: StructuredResume
  tailored: StructuredResume
  changes: ResumeDiffChange[]
  decisions: Record<string, ChangeDecision>
  onDecisionsChange: (next: Record<string, ChangeDecision>) => void
  onSave?: () => Promise<void>
  saving?: boolean
  highlightedChangeId?: string | null
  onHighlightChange?: (id: string | null) => void
  /** When set, each card can show ATS impact of keeping this change. */
  jobExtracted?: JobExtractedData | null
  /** Live whole-resume score total (updates as decisions change). */
  liveScoreTotal?: number | null
}

function changeLabel(change: ResumeDiffChange, original: StructuredResume): string {
  if (change.section === 'summary') return 'Summary'
  if (change.section === 'skills') return 'Skills'
  if (change.section === 'experience' && change.expId) {
    const exp = original.experience.find(e => e.id === change.expId)
    return exp ? `${exp.title} @ ${exp.company}` : 'Experience'
  }
  if (change.section === 'projects' && change.projId) {
    const proj = original.projects.find(p => p.id === change.projId)
    return proj?.name ?? 'Project'
  }
  return change.section
}

function actionVerb(change: ResumeDiffChange): string {
  switch (change.changeType) {
    case 'added':
      return 'Added'
    case 'removed':
      return 'Removed'
    case 'reordered':
      return 'Reordered'
    case 'rephrased':
      return 'Rephrased'
    case 'changed':
      return 'Updated'
    default:
      return 'Updated'
  }
}

function whyLine(change: ResumeDiffChange): string {
  const reason = change.reason?.trim()
  if (reason) return reason
  return `${actionVerb(change)} ${change.field === 'text' ? 'wording' : change.field} to better match this job.`
}

function displayAfter(
  change: ResumeDiffChange,
  decision: ChangeDecision | undefined
): string {
  if (decision?.status === 'edited' && decision.editedValue != null) {
    return Array.isArray(decision.editedValue)
      ? decision.editedValue.join(' ')
      : String(decision.editedValue)
  }
  if (decision?.status === 'declined') {
    return Array.isArray(change.before)
      ? change.before.join(' ')
      : String(change.before || 'Original kept')
  }
  return Array.isArray(change.after) ? change.after.join(' ') : String(change.after ?? '')
}

function displayBefore(change: ResumeDiffChange): string {
  return Array.isArray(change.before) ? change.before.join(' ') : String(change.before ?? '')
}

function statusStyles(status: ChangeDecision['status'] | undefined) {
  switch (status) {
    case 'accepted':
      return 'border-brand-green/30 bg-brand-green/5'
    case 'declined':
      return 'border-red-500/30 bg-red-500/5 opacity-90'
    case 'edited':
      return 'border-brand-purple/30 bg-brand-purple/5'
    default:
      return 'border-border bg-card/40'
  }
}

function statusLabel(status: ChangeDecision['status']): string {
  switch (status) {
    case 'accepted':
      return 'Accepted'
    case 'declined':
      return 'Declined'
    case 'edited':
      return 'Your edit'
    default:
      return 'Needs review'
  }
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `${delta}`
  return '±0'
}

export function TailorDiff({
  original,
  tailored,
  changes,
  decisions,
  onDecisionsChange,
  onSave,
  saving,
  highlightedChangeId = null,
  onHighlightChange,
  jobExtracted = null,
  liveScoreTotal = null,
}: TailorDiffProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  const updateDecision = useCallback(
    (id: string, patch: Partial<ChangeDecision>) => {
      onDecisionsChange({
        ...decisions,
        [id]: { ...decisions[id], status: decisions[id]?.status ?? 'pending', ...patch },
      })
    },
    [decisions, onDecisionsChange]
  )

  const impacts = useMemo(() => {
    if (!jobExtracted || changes.length === 0) return {} as Record<string, ReturnType<typeof scoreImpactForChange>>
    const out: Record<string, ReturnType<typeof scoreImpactForChange>> = {}
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i]
      const id = getChangeId(change, i)
      out[id] = scoreImpactForChange({
        original,
        tailored,
        changes,
        decisions,
        change,
        changeIndex: i,
        jobExtractedData: jobExtracted,
      })
    }
    return out
  }, [jobExtracted, original, tailored, changes, decisions])

  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No major structural changes — keywords and phrasing were optimized.
      </p>
    )
  }

  const pendingCount = changes.filter(
    (c, i) => (decisions[getChangeId(c, i)]?.status ?? 'pending') === 'pending'
  ).length

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function startEdit(id: string, change: ResumeDiffChange) {
    setEditingId(id)
    setExpandedIds(prev => new Set(prev).add(id))
    const val = decisions[id]?.editedValue ?? change.after
    setEditDraft(Array.isArray(val) ? val.join('\n') : String(val))
  }

  function saveEdit(id: string, change: ResumeDiffChange) {
    const editedValue =
      change.field === 'bullets'
        ? editDraft.split('\n').map(s => s.trim()).filter(Boolean)
        : editDraft.trim()
    updateDecision(id, { status: 'edited', editedValue })
    setEditingId(null)
    setExpandedIds(prev => new Set(prev).add(id))
  }

  function declineOneTap(id: string) {
    updateDecision(id, {
      status: 'declined',
      declineReasonCode: 'prefer_original',
      declineReason: 'Prefer original wording',
    })
    setEditingId(null)
  }

  function undoDecision(id: string) {
    onDecisionsChange({
      ...decisions,
      [id]: { status: 'pending' },
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} to review`
              : 'All changes reviewed'}
          </p>
          {liveScoreTotal != null ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
              Live match {Math.round(liveScoreTotal)}% — updates as you accept, decline, or edit
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDecisionsChange(setAllDecisions(changes, decisions, 'accepted'))}
          >
            Accept all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onDecisionsChange(
                setAllDecisions(changes, decisions, 'declined', {
                  declineReasonCode: 'prefer_original',
                  declineReason: 'Prefer original wording',
                })
              )
            }
          >
            Decline all
          </Button>
          {onSave && (
            <Button type="button" size="sm" disabled={saving} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save review'}
            </Button>
          )}
        </div>
      </div>

      {changes.map((change, i) => {
        const id = getChangeId(change, i)
        const decision = decisions[id]
        const status = decision?.status ?? 'pending'
        const decided = status !== 'pending'
        const isHighlighted = highlightedChangeId === id
        const isEditing = editingId === id
        const expanded = expandedIds.has(id) || isEditing
        const impact = impacts[id]
        const preview = displayAfter(change, decision)
        const before = displayBefore(change)

        return (
          <div
            key={id}
            tabIndex={0}
            onMouseEnter={() => onHighlightChange?.(id)}
            onMouseLeave={() => onHighlightChange?.(null)}
            onFocus={() => onHighlightChange?.(id)}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                onHighlightChange?.(null)
              }
            }}
            className={cn(
              'rounded-xl border p-3 space-y-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40',
              statusStyles(status),
              isHighlighted && 'ring-2 ring-teal-600/50 border-teal-600/40'
            )}
          >
            {/* Header: what + status + actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    {changeLabel(change, original)}
                  </p>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground rounded-md bg-secondary/80 px-1.5 py-0.5">
                    {actionVerb(change)}
                  </span>
                  {decided ? (
                    <span
                      className={cn(
                        'text-[10px] font-medium rounded-md px-1.5 py-0.5',
                        status === 'accepted' && 'bg-brand-green/15 text-brand-green',
                        status === 'declined' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                        status === 'edited' && 'bg-brand-purple/15 text-brand-purple'
                      )}
                    >
                      {statusLabel(status)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground text-pretty leading-snug">
                  <span className="font-medium text-foreground/80">Why: </span>
                  {whyLine(change)}
                </p>
              </div>

              {decided && !isEditing ? (
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2"
                    aria-label="Undo decision"
                    onClick={() => undoDecision(id)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-xs">Undo</span>
                  </Button>
                  {(status === 'accepted' || status === 'edited') && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label="Decline change"
                        onClick={() => declineOneTap(id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label="Edit change"
                        onClick={() => startEdit(id, change)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ) : !isEditing ? (
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Accept change"
                    onClick={() => updateDecision(id, { status: 'accepted' })}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Decline change"
                    onClick={() => declineOneTap(id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Edit change"
                    onClick={() => startEdit(id, change)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Collapsed preview of the suggested / current text */}
            {!isEditing ? (
              <p className="text-sm text-foreground line-clamp-3 text-pretty leading-snug">
                {preview || '—'}
              </p>
            ) : null}

            {/* Score impact for this change */}
            {impact && status !== 'declined' ? (
              <p
                className={cn(
                  'text-[11px] tabular-nums',
                  impact.delta > 0 && 'text-brand-green',
                  impact.delta < 0 && 'text-red-600 dark:text-red-400',
                  impact.delta === 0 && 'text-muted-foreground'
                )}
              >
                {formatDelta(impact.delta)} match pts if kept
                {impact.keywordsGained.length > 0
                  ? ` · picks up ${impact.keywordsGained.slice(0, 3).join(', ')}`
                  : ''}
                {impact.skillsGained.length > 0 && impact.keywordsGained.length === 0
                  ? ` · skills: ${impact.skillsGained.slice(0, 3).join(', ')}`
                  : ''}
              </p>
            ) : impact && status === 'declined' ? (
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Keeping original · accepting would be {formatDelta(impact.delta)} pts
              </p>
            ) : null}

            {/* Expand / collapse details */}
            <button
              type="button"
              className="flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={expanded}
              onClick={() => toggleExpanded(id)}
            >
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')}
              />
              {expanded ? 'Hide details' : 'Show before / after'}
            </button>

            {expanded ? (
              <div className="space-y-2 pt-1 border-t border-border/60">
                {isEditing ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Edit this section. Score updates when you save.
                    </p>
                    <Textarea
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      rows={change.field === 'bullets' ? 5 : 4}
                      className="text-sm"
                      aria-label="Edit change text"
                    />
                    {change.field === 'bullets' && (
                      <p className="text-[10px] text-muted-foreground">One bullet per line</p>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => saveEdit(id, change)}>
                        Save edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg bg-secondary/40 border border-border p-2.5 space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Before
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {before || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-brand-green/5 border border-brand-green/20 p-2.5 space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {status === 'edited' ? 'Your version' : 'Suggested'}
                      </p>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {preview || '—'}
                      </p>
                    </div>
                    {impact ? (
                      <div className="rounded-lg border border-border bg-card/60 p-2.5 space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Effect on match
                        </p>
                        <p className="text-xs text-foreground tabular-nums">
                          {formatDelta(impact.delta)} points
                          <span className="text-muted-foreground">
                            {' '}
                            ({impact.withoutTotal}% without → {impact.withTotal}% with)
                          </span>
                        </p>
                        {impact.keywordsGained.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            Adds keywords: {impact.keywordsGained.slice(0, 6).join(', ')}
                          </p>
                        ) : null}
                        {impact.keywordsLost.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            Loses keywords: {impact.keywordsLost.slice(0, 6).join(', ')}
                          </p>
                        ) : null}
                        {impact.skillsGained.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            Adds skills: {impact.skillsGained.slice(0, 6).join(', ')}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
