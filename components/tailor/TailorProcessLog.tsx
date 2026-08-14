'use client'

import { useEffect, useRef } from 'react'
import { AlertCircle, Check, ChevronDown, ChevronUp, Circle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatLogTime, type TailorProcessLogEntry, type TailorLogStatus } from '@/lib/tailor/process-log'

function StatusIcon({ status }: { status: TailorLogStatus }) {
  switch (status) {
    case 'ok':
      return <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
    case 'warn':
      return <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
    case 'error':
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
    case 'pending':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600 dark:text-teal-400" />
    default:
      return <Circle className="h-3 w-3 opacity-40" />
  }
}

type TailorProcessLogProps = {
  entries: TailorProcessLogEntry[]
  expanded: boolean
  onToggle: () => void
  className?: string
}

export function TailorProcessLog({ entries, expanded, onToggle, className }: TailorProcessLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [entries, expanded])

  if (entries.length === 0) return null

  const hasError = entries.some(e => e.status === 'error')
  const pending = entries.some(e => e.status === 'pending')
  const last = entries[entries.length - 1]

  return (
    <div className={cn('mx-4 mt-3 rounded-lg border border-border bg-card/80', className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">Process log</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {pending ? `Running: ${last?.label ?? '…'}` : hasError ? 'Stopped with an error' : `${entries.length} steps completed`}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onToggle}>
          {expanded ? (
            <>
              Hide <ChevronUp className="ml-1 h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {expanded ? (
        <div className="max-h-48 overflow-y-auto border-t border-border px-3 py-2">
          <ul className="space-y-2" role="log" aria-live="polite">
            {entries.map(entry => (
              <li key={entry.id} className="flex gap-2 text-xs">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <StatusIcon status={entry.status} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span
                      className={cn(
                        'font-medium',
                        entry.status === 'error' && 'text-destructive',
                        entry.status === 'warn' && 'text-amber-700 dark:text-amber-300'
                      )}
                    >
                      {entry.label}
                    </span>
                    {entry.ms != null ? (
                      <span className="tabular-nums text-[10px] text-muted-foreground">
                        +{formatLogTime(entry.ms)}
                      </span>
                    ) : null}
                  </div>
                  {entry.detail ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{entry.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>
        </div>
      ) : null}
    </div>
  )
}
