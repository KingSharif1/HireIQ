'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import type { PendingSuggestion } from '@/types'
import { suggestionNeedsFollowUp } from '@/lib/profile/suggestion-followup'
import type { SuggestionEnrichment } from '@/lib/profile/suggestion-followup'
import { AcceptFollowUpSheet } from '@/components/profile/AcceptFollowUpSheet'

interface Props {
  suggestions: PendingSuggestion[]
  onResolved: (
    suggestionId: string,
    action: 'accept' | 'decline',
    enrichment?: SuggestionEnrichment
  ) => Promise<void>
}

export function PendingSuggestionsPanel({ suggestions, onResolved }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<PendingSuggestion | null>(null)

  if (suggestions.length === 0) return null

  async function handle(action: 'accept' | 'decline', suggestion: PendingSuggestion) {
    if (action === 'accept' && suggestionNeedsFollowUp(suggestion)) {
      setFollowUp(suggestion)
      return
    }
    setBusyId(suggestion.id)
    try {
      await onResolved(suggestion.id, action)
    } finally {
      setBusyId(null)
    }
  }

  async function confirmFollowUp(enrichment: SuggestionEnrichment) {
    if (!followUp) return
    setBusyId(followUp.id)
    try {
      await onResolved(followUp.id, 'accept', enrichment)
      setFollowUp(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          Pending updates to master ({suggestions.length})
        </div>
        {suggestions.map(s => (
          <div
            key={s.id}
            className="rounded-md border border-border bg-white dark:bg-card p-4 space-y-3"
          >
            <p className="text-xs text-muted-foreground">
              {[
                s.source === 'github' ? 'From GitHub' : s.jobLabel ? `From ${s.jobLabel}` : null,
                'Suggested for this section',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{s.proposedText}</p>
            <p className="text-xs text-muted-foreground">{s.reason}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handle('accept', s)}
                disabled={busyId === s.id}
              >
                {busyId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handle('decline', s)}
                disabled={busyId === s.id}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>

      {followUp ? (
        <AcceptFollowUpSheet
          suggestion={followUp}
          busy={busyId === followUp.id}
          onCancel={() => setFollowUp(null)}
          onConfirm={confirmFollowUp}
        />
      ) : null}
    </>
  )
}
