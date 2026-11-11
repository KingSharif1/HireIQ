'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export interface FollowUpItemView {
  applicationId: string
  company: string
  title: string
  dueAt: string
  daysUntilDue: number
  draft: string
}

function overdueLabel(daysUntilDue: number): string {
  const overdue = Math.abs(daysUntilDue)
  if (overdue === 0) return 'due today'
  if (overdue === 1) return 'due yesterday'
  return `${overdue} days overdue`
}

/**
 * "Follow-ups due" — applications that have gone quiet and deserve one nudge.
 * Data is computed on the server with lib/applications/follow-ups.ts; this
 * component only handles the snooze/dismiss interaction.
 */
export function FollowUpsPanel({ initialDue }: { initialDue: FollowUpItemView[] }) {
  const [items, setItems] = useState<FollowUpItemView[]>(initialDue)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openDraftId, setOpenDraftId] = useState<string | null>(null)

  if (items.length === 0) return null

  async function act(applicationId: string, action: 'snooze' | 'done') {
    setBusyId(applicationId)
    try {
      const res = await fetch('/api/agent/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action }),
      })
      if (res.ok) {
        setItems((current) => current.filter((item) => item.applicationId !== applicationId))
        setOpenDraftId((current) => (current === applicationId ? null : current))
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {items.length} follow-up{items.length === 1 ? '' : 's'} due
        </h2>
        <span className="text-xs text-muted-foreground">No reply yet — one nudge usually wakes things up.</span>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const busy = busyId === item.applicationId
          const open = openDraftId === item.applicationId
          return (
            <li key={item.applicationId} className="rounded-lg border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.company || 'Unknown company'}
                    {item.title ? <span className="text-muted-foreground"> · {item.title}</span> : null}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">{overdueLabel(item.daysUntilDue)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenDraftId(open ? null : item.applicationId)}
                  >
                    {open ? 'Hide draft' : 'Draft'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(item.applicationId, 'snooze')}>
                    Snooze 7d
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => void act(item.applicationId, 'done')}>
                    Sent
                  </Button>
                </div>
              </div>
              {open ? (
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/40 p-2 text-xs">{item.draft}</pre>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
