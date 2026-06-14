'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import type { PendingSuggestion } from '@/types'

interface Props {
  suggestions: PendingSuggestion[]
  onResolved: (suggestionId: string, action: 'accept' | 'decline') => Promise<void>
}

export function PendingSuggestionsPanel({ suggestions, onResolved }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)

  if (suggestions.length === 0) return null

  async function handle(action: 'accept' | 'decline', id: string) {
    setBusyId(id)
    try {
      await onResolved(id, action)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-purple">
        <Sparkles className="w-4 h-4" />
        Suggestions from tailoring ({suggestions.length})
      </div>
      {suggestions.map(s => (
        <div
          key={s.id}
          className="rounded-xl border border-brand-purple/30 bg-brand-purple/5 p-4 space-y-3"
        >
          <p className="text-xs text-muted-foreground">{s.jobLabel}</p>
          <p className="text-sm text-foreground leading-relaxed">{s.proposedText}</p>
          <p className="text-xs text-muted-foreground">{s.reason}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handle('accept', s.id)}
              disabled={busyId === s.id}
            >
              {busyId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handle('decline', s.id)}
              disabled={busyId === s.id}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
