'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PendingSuggestion } from '@/types'
import {
  enrichmentDefaults,
  validateEnrichment,
  type SuggestionEnrichment,
} from '@/lib/profile/suggestion-followup'
import { Field } from '@/components/profile/primitives'

interface AcceptFollowUpSheetProps {
  suggestion: PendingSuggestion
  busy?: boolean
  onCancel: () => void
  onConfirm: (enrichment: SuggestionEnrichment) => Promise<void>
}

export function AcceptFollowUpSheet({
  suggestion,
  busy,
  onCancel,
  onConfirm,
}: AcceptFollowUpSheetProps) {
  const [form, setForm] = useState<SuggestionEnrichment>(() => enrichmentDefaults(suggestion))
  const [error, setError] = useState<string | null>(null)

  function patch(p: Partial<SuggestionEnrichment>) {
    setForm(prev => ({ ...prev, ...p }))
    setError(null)
  }

  function setBullet(i: number, text: string) {
    const bullets = [...form.bullets]
    bullets[i] = text
    patch({ bullets })
  }

  async function submit() {
    const err = validateEnrichment(form)
    if (err) {
      setError(err)
      return
    }
    await onConfirm({
      ...form,
      title: form.title.trim(),
      bullets: form.bullets.map(b => b.trim()).filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onCancel}
        disabled={busy}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accept-followup-title"
        className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-auto rounded-t-xl sm:rounded-xl border border-border bg-white dark:bg-card shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sticky top-0 bg-white dark:bg-card">
          <div className="min-w-0">
            <h2 id="accept-followup-title" className="text-sm font-semibold text-foreground">
              Add to master resume
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fill the required fields, then we’ll add this to your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-muted-foreground hover:bg-secondary"
            disabled={busy}
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            {(['experience', 'project'] as const).map(kind => (
              <button
                key={kind}
                type="button"
                onClick={() => patch({ entryKind: kind })}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm border transition-colors',
                  form.entryKind === kind
                    ? 'border-foreground bg-secondary text-foreground font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {kind === 'experience' ? 'Experience' : 'Project'}
              </button>
            ))}
          </div>

          <Field label={form.entryKind === 'project' ? 'Project name *' : 'Title *'}>
            <Input
              value={form.title}
              onChange={e => patch({ title: e.target.value })}
              placeholder={form.entryKind === 'project' ? 'Billing dashboard' : 'Software Engineer'}
            />
          </Field>

          {form.entryKind === 'experience' ? (
            <Field label="Company (optional)">
              <Input
                value={form.company ?? ''}
                onChange={e => patch({ company: e.target.value })}
                placeholder="Acme Corp"
              />
            </Field>
          ) : (
            <>
              <Field label="Live URL (optional)">
                <Input
                  value={form.url ?? ''}
                  onChange={e => patch({ url: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Repo (optional)">
                <Input
                  value={form.github ?? ''}
                  onChange={e => patch({ github: e.target.value })}
                  placeholder="https://github.com/…"
                />
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start (optional)">
              <Input
                value={form.startDate ?? ''}
                onChange={e => patch({ startDate: e.target.value })}
                placeholder="2023-01"
              />
            </Field>
            <Field label="End (optional)">
              <Input
                value={form.endDate ?? ''}
                onChange={e => patch({ endDate: e.target.value })}
                placeholder="Present"
                disabled={form.current}
              />
            </Field>
          </div>

          {form.entryKind === 'experience' ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={Boolean(form.current)}
                onChange={e => patch({ current: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
              />
              Current role
            </label>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">What you did *</p>
            {form.bullets.map((b, i) => (
              <Textarea
                key={i}
                value={b}
                onChange={e => setBullet(i, e.target.value)}
                rows={3}
                placeholder="Built X that led to Y…"
              />
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => patch({ bullets: [...form.bullets, ''] })}
            >
              Add bullet
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to master'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
