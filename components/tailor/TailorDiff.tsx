'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getChangeId, setAllDecisions } from '@/lib/tailor/change-decisions'
import type { ChangeDecision, DeclineReasonCode, ResumeDiffChange, StructuredResume } from '@/types'
import { Check, X, Pencil, ChevronDown } from 'lucide-react'

const DECLINE_OPTIONS: { code: DeclineReasonCode; label: string }[] = [
  { code: 'not_accurate', label: 'Not accurate' },
  { code: 'too_strong', label: 'Too strong a claim' },
  { code: 'prefer_original', label: 'Prefer original wording' },
  { code: 'not_relevant', label: 'Not relevant to this role' },
  { code: 'other', label: 'Other' },
]

interface TailorDiffProps {
  original: StructuredResume
  tailored: StructuredResume
  changes: ResumeDiffChange[]
  decisions: Record<string, ChangeDecision>
  onDecisionsChange: (next: Record<string, ChangeDecision>) => void
  onSave?: () => Promise<void>
  saving?: boolean
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

function statusStyles(status: ChangeDecision['status'] | undefined) {
  switch (status) {
    case 'accepted':
      return 'border-brand-green/30 bg-brand-green/5'
    case 'declined':
      return 'border-red-500/30 bg-red-500/5 opacity-75'
    case 'edited':
      return 'border-brand-purple/30 bg-brand-purple/5'
    default:
      return 'border-border bg-card/40'
  }
}

export function TailorDiff({
  original,
  tailored,
  changes,
  decisions,
  onDecisionsChange,
  onSave,
  saving,
}: TailorDiffProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [decliningId, setDecliningId] = useState<string | null>(null)

  const updateDecision = useCallback(
    (id: string, patch: Partial<ChangeDecision>) => {
      onDecisionsChange({
        ...decisions,
        [id]: { ...decisions[id], status: decisions[id]?.status ?? 'pending', ...patch },
      })
    },
    [decisions, onDecisionsChange]
  )

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

  function startEdit(id: string, change: ResumeDiffChange) {
    setEditingId(id)
    const val = decisions[id]?.editedValue ?? change.after
    setEditDraft(Array.isArray(val) ? val.join('\n') : String(val))
  }

  function saveEdit(id: string, change: ResumeDiffChange) {
    const editedValue = change.field === 'bullets'
      ? editDraft.split('\n').map(s => s.trim()).filter(Boolean)
      : editDraft.trim()
    updateDecision(id, { status: 'edited', editedValue })
    setEditingId(null)
  }

  function confirmDecline(id: string, code: DeclineReasonCode, label: string) {
    updateDecision(id, {
      status: 'declined',
      declineReasonCode: code,
      declineReason: label,
    })
    setDecliningId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-xs text-muted-foreground">
          {pendingCount > 0
            ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} to review`
            : 'All changes reviewed'}
        </p>
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
            onClick={() => onDecisionsChange(setAllDecisions(changes, decisions, 'declined', { declineReasonCode: 'prefer_original', declineReason: 'Prefer original wording' }))}
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
        const isStringChange = typeof change.before === 'string'

        return (
          <div
            key={id}
            className={cn('rounded-xl border p-4 space-y-3 transition-colors', statusStyles(status))}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {changeLabel(change, original)}
                  {change.changeType && (
                    <span className="ml-2 normal-case text-[10px] font-normal capitalize">
                      · {change.changeType}
                    </span>
                  )}
                </p>
                {change.reason && (
                  <p className="text-xs text-muted-foreground mt-1">{change.reason}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Accept"
                  onClick={() => updateDecision(id, { status: 'accepted' })}
                >
                  <Check className={cn('w-4 h-4', status === 'accepted' ? 'text-brand-green' : '')} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Decline"
                  onClick={() => setDecliningId(decliningId === id ? null : id)}
                >
                  <X className={cn('w-4 h-4', status === 'declined' ? 'text-red-500' : '')} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Edit"
                  onClick={() => startEdit(id, change)}
                >
                  <Pencil className={cn('w-4 h-4', status === 'edited' ? 'text-brand-purple' : '')} />
                </Button>
              </div>
            </div>

            {decliningId === id && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Why decline? (helps future suggestions)</p>
                <div className="flex flex-wrap gap-2">
                  {DECLINE_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      type="button"
                      className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-secondary transition-colors"
                      onClick={() => confirmDecline(id, opt.code, opt.label)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editingId === id ? (
              <div className="space-y-2">
                <Textarea
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  rows={change.field === 'bullets' ? 4 : 3}
                  className="text-sm"
                />
                {change.field === 'bullets' && (
                  <p className="text-[10px] text-muted-foreground">One bullet per line</p>
                )}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => saveEdit(id, change)}>Save edit</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                {isStringChange ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-2.5">
                      <p className="text-xs text-muted-foreground mb-1">Before</p>
                      <p className="text-sm line-through text-muted-foreground">{change.before as string}</p>
                    </div>
                    <div className="rounded-lg bg-brand-green/5 border border-brand-green/15 p-2.5">
                      <p className="text-xs text-muted-foreground mb-1">After</p>
                      <p className="text-sm text-foreground">
                        {status === 'edited' && decision?.editedValue
                          ? String(decision.editedValue)
                          : (change.after as string)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(change.after as string[]).map((bullet, j) => {
                      const beforeBullet = (change.before as string[])[j] ?? ''
                      const edited = status === 'edited' && Array.isArray(decision?.editedValue)
                        ? decision.editedValue[j]
                        : bullet
                      if (!edited && !beforeBullet) return null
                      return (
                        <div key={j} className="text-sm space-y-1">
                          {beforeBullet && beforeBullet !== edited && (
                            <p className="text-muted-foreground line-through text-xs">{beforeBullet}</p>
                          )}
                          <p className="text-foreground">{edited}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {status !== 'pending' && (
              <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                {status}
                {decision?.declineReason ? ` — ${decision.declineReason}` : ''}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
