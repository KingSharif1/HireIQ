'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

type EditableTextProps = {
  value: string
  onSave: (next: string) => void
  multiline?: boolean
  className?: string
  displayClassName?: string
  placeholder?: string
  label?: string
}

/** Teal-style pen: tap to edit the actual text, not just include/exclude. */
export function EditableText({
  value,
  onSave,
  multiline = false,
  className,
  displayClassName,
  placeholder = 'Add text…',
  label = 'Edit text',
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  function commit() {
    const next = draft.trim()
    if (next !== value.trim()) onSave(draft)
    setEditing(false)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    const shared = cn(
      'w-full rounded-md border border-teal-600/50 bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-600/30',
      className
    )
    return (
      <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
        {multiline ? (
          <textarea
            autoFocus
            rows={4}
            className={cn(shared, 'min-h-[88px] resize-y')}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            aria-label={label}
          />
        ) : (
          <input
            autoFocus
            className={shared}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') cancel()
            }}
            placeholder={placeholder}
            aria-label={label}
          />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-teal-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-teal-700"
            onClick={commit}
          >
            Done
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('group/edit flex items-start gap-1.5', className)}>
      <p className={cn('flex-1 min-w-0 whitespace-pre-wrap', displayClassName, !value && 'text-muted-foreground italic')}>
        {value || placeholder}
      </p>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setEditing(true)
        }}
        className="mt-0.5 shrink-0 rounded-md p-1 text-teal-700 opacity-100 hover:bg-teal-600/10 md:opacity-0 md:group-hover/edit:opacity-100 dark:text-teal-400"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
