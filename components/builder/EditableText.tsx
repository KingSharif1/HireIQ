'use client'

import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

type EditableTextProps = {
  value: string
  onSave: (next: string) => void
  /** Live preview while typing (optional). */
  onLiveChange?: (next: string) => void
  multiline?: boolean
  className?: string
  displayClassName?: string
  placeholder?: string
  label?: string
  /** Always show an Edit control (mobile). Desktop still gets hover affordance. */
  alwaysShowEdit?: boolean
}

/** Teal-style edit: hover Edit on desktop, always-visible Edit on mobile. */
export function EditableText({
  value,
  onSave,
  onLiveChange,
  multiline = false,
  className,
  displayClassName,
  placeholder = 'Add text…',
  label = 'Edit',
  alwaysShowEdit = true,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  function commit() {
    onSave(draft)
    setEditing(false)
  }

  function cancel() {
    setDraft(value)
    onLiveChange?.(value)
    setEditing(false)
  }

  function updateDraft(next: string) {
    setDraft(next)
    onLiveChange?.(next)
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
            onChange={e => updateDraft(e.target.value)}
            placeholder={placeholder}
            aria-label={label}
          />
        ) : (
          <input
            autoFocus
            className={shared}
            value={draft}
            onChange={e => updateDraft(e.target.value)}
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
            className="rounded-md bg-teal-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-teal-700"
            onClick={commit}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('group/edit flex items-start gap-2', className)}>
      <p
        className={cn(
          'flex-1 min-w-0 whitespace-pre-wrap',
          displayClassName,
          !value && 'text-muted-foreground italic'
        )}
      >
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
        className={cn(
          'mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-md border border-teal-600/30 bg-teal-600/5 px-2 py-1 text-[11px] font-medium text-teal-800 dark:text-teal-300',
          alwaysShowEdit
            ? 'opacity-100'
            : 'opacity-100 md:opacity-0 md:group-hover/edit:opacity-100',
          'hover:bg-teal-600/15'
        )}
      >
        <Pencil className="h-3 w-3" />
        <span>Edit</span>
      </button>
    </div>
  )
}
