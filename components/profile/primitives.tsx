'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, X, ChevronDown, ChevronUp, FileText, FolderGit2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="text-center py-12 border border-dashed border-border rounded-xl">
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button onClick={onAction} variant="secondary" size="sm">
        <Plus className="w-4 h-4" />
        {actionLabel}
      </Button>
    </div>
  )
}

/** Collapsible card for a single repeatable entry (experience, project, etc). */
export function EntryCard({
  title,
  subtitle,
  sourceLine,
  sourceHref,
  sourceBadge,
  onRemove,
  children,
  defaultOpen = true,
  entryId,
}: {
  title: string
  subtitle?: string
  /** Muted provenance, e.g. "From Role @ Company" */
  sourceLine?: string | null
  sourceHref?: string | null
  /** Small origin chip: GitHub logo or resume parse. */
  sourceBadge?: 'github' | 'resume' | null
  onRemove: () => void
  children: React.ReactNode
  defaultOpen?: boolean
  entryId?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div id={entryId ? `entry-${entryId}` : undefined} className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{title || 'Untitled'}</p>
              {sourceBadge === 'github' && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground flex-shrink-0"
                  title="From GitHub"
                >
                  <FolderGit2 className="w-3 h-3" />
                  GitHub
                </span>
              )}
              {sourceBadge === 'resume' && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground flex-shrink-0"
                  title="From uploaded resume"
                >
                  <FileText className="w-3 h-3" />
                  Resume
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            {sourceLine ? (
              sourceHref ? (
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline truncate block mt-0.5"
                  onClick={e => e.stopPropagation()}
                >
                  {sourceLine}
                </a>
              ) : (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sourceLine}</p>
              )
            ) : null}
          </div>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
          aria-label="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {open && <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">{children}</div>}
    </div>
  )
}

/** Bulleted-list editor for entry highlights. */
export function BulletEditor({
  bullets,
  onChange,
}: {
  bullets: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-brand-purple mt-2.5 text-xs">•</span>
          <textarea
            value={b}
            onChange={e => {
              const next = [...bullets]
              next[i] = e.target.value
              onChange(next)
            }}
            rows={2}
            placeholder="Describe an accomplishment, impact, or responsibility…"
            className="flex-1 rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
          />
          <button
            type="button"
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-destructive p-1.5 mt-1 rounded-md hover:bg-destructive/10 transition-colors"
            aria-label="Remove bullet"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...bullets, ''])}>
        <Plus className="w-3.5 h-3.5" />
        Add bullet
      </Button>
    </div>
  )
}

/** Tag input — add by typing + Enter, remove by clicking. */
export function TagInput({
  tags,
  onChange,
  placeholder = 'Type and press Enter…',
}: {
  tags: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [value, setValue] = useState('')

  function add() {
    const v = value.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setValue('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter(t => t !== tag))}
              className="hover:text-destructive"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {tags.length === 0 && <span className="text-xs text-muted-foreground">No items yet.</span>}
      </div>
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        placeholder={placeholder}
      />
    </div>
  )
}

export function MonthRange({
  start,
  end,
  current,
  onChange,
}: {
  start: string
  end: string
  current: boolean
  onChange: (patch: { startDate?: string; endDate?: string; current?: boolean }) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Start date">
        <Input
          value={start}
          onChange={e => onChange({ startDate: e.target.value })}
          placeholder="Jan 2022"
        />
      </Field>
      <Field label="End date">
        <Input
          value={current ? '' : end}
          disabled={current}
          onChange={e => onChange({ endDate: e.target.value })}
          placeholder="Present"
          className={cn(current && 'opacity-50')}
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={current}
            onChange={e => onChange({ current: e.target.checked })}
            className="accent-brand-purple"
          />
          I currently work here
        </label>
      </Field>
    </div>
  )
}
