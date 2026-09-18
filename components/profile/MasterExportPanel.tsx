'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, GripVertical, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { cn } from '@/lib/utils'
import {
  DEFAULT_RESUME_THEME,
  DEFAULT_SECTION_LABELS,
  DEFAULT_SECTION_ORDER,
  applyDensity,
  inferDensity,
  mergeResumeTheme,
  type ResumeDensity,
  type ResumeTheme,
} from '@/lib/export/theme'
import { filterResumeBySections } from '@/lib/export/format'
import { applyInclusion, isIncluded, toggleInclusionId } from '@/lib/profile/inclusion'
import { displaySkills } from '@/lib/profile/skills'
import type { ProfileData, ResumeInclusion } from '@/types'

const EXPORT_SECTIONS = [...DEFAULT_SECTION_ORDER]

type MasterExportDialogProps = {
  open: boolean
  onClose: () => void
  data: ProfileData
  savedTheme?: ResumeTheme | null
}

export function MasterExportDialog({
  open,
  onClose,
  data,
  savedTheme = null,
}: MasterExportDialogProps) {
  const [theme, setTheme] = useState<ResumeTheme>(() =>
    mergeResumeTheme(DEFAULT_RESUME_THEME, savedTheme)
  )
  const [inclusion, setInclusion] = useState<ResumeInclusion>(() => ({
    sectionIds: [...EXPORT_SECTIONS],
    experienceIds: (data.experience ?? []).map(e => e.id),
    projectIds: (data.projects ?? []).map(p => p.id),
    educationIds: (data.education ?? []).map(e => e.id),
    skillIds: displaySkills(data.skills).map(s => s.id),
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobilePreview, setMobilePreview] = useState(false)
  const density = inferDensity(theme)

  const sectionOrder = theme.sectionOrder.length ? theme.sectionOrder : [...EXPORT_SECTIONS]

  const previewData = useMemo(() => {
    const included = sectionOrder.filter(id => isIncluded(inclusion, 'section', id))
    return filterResumeBySections(
      applyInclusion(data, { ...inclusion, sectionIds: included }),
      included
    )
  }, [data, inclusion, sectionOrder])

  const includedSectionIds = sectionOrder.filter(id => isIncluded(inclusion, 'section', id))
  const includedCount = includedSectionIds.length

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function move(index: number, dir: -1 | 1) {
    const next = [...sectionOrder]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setTheme(prev => ({ ...prev, sectionOrder: next }))
  }

  function setDensity(d: ResumeDensity) {
    setTheme(prev => applyDensity(prev, d))
  }

  async function download() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'master',
          themeOverride: theme,
          inclusion: {
            ...inclusion,
            sectionIds: includedSectionIds,
          },
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Export failed')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'master-resume.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const controls = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Size
        </p>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-secondary/40 p-1">
          {([
            ['compact', 'Compact'],
            ['standard', 'Standard'],
            ['spacious', 'Spacious'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDensity(id)}
              className={cn(
                'rounded-lg px-2 py-2 text-xs font-semibold transition-colors',
                density === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Sections · {includedCount} on the page
        </p>
        <ul className="space-y-1.5">
          {sectionOrder.map((key, i) => {
            const included = isIncluded(inclusion, 'section', key)
            return (
              <li
                key={key}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2 py-2',
                  included ? 'border-border bg-background' : 'border-transparent bg-secondary/40'
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={included}
                  onChange={e =>
                    setInclusion(prev =>
                      toggleInclusionId(prev, 'sectionIds', key, sectionOrder, e.target.checked)
                    )
                  }
                  aria-label={`Include ${DEFAULT_SECTION_LABELS[key] ?? key}`}
                />
                <span className="min-w-0 flex-1 text-sm text-foreground">
                  {DEFAULT_SECTION_LABELS[key] ?? key}
                </span>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="rounded border border-border px-1.5 text-[10px] text-muted-foreground disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${key} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-1.5 text-[10px] text-muted-foreground disabled:opacity-30"
                    disabled={i === sectionOrder.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${key} down`}
                  >
                    ↓
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )

  const preview = (
    <div className="flex min-h-0 flex-1 flex-col bg-[hsl(210_20%_94%)] dark:bg-secondary/30">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Live page
        </p>
        <p className="text-xs text-muted-foreground">Zoom with the controls · drag to pan</p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2 md:p-3">
        {includedCount === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            Include at least one section to preview the page.
          </p>
        ) : (
          <ResumePreview
            data={previewData}
            theme={{ ...theme, sectionOrder: includedSectionIds }}
            showTools
            showHealth={false}
            enablePan
            fitAxis="width"
            className="h-full min-h-[36rem]"
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:p-3 lg:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close export"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="master-export-title"
        className="relative flex h-[94dvh] w-full max-w-[min(98vw,1480px)] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl md:my-auto md:h-[min(96dvh,980px)] md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0">
            <h2 id="master-export-title" className="text-base font-semibold text-foreground">
              Export master resume
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose sections, order, and size. Job-tailored PDFs still live on each application’s
              Documents tab.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="min-h-0 overflow-auto p-4 md:w-[280px] lg:w-[300px] md:shrink-0 md:border-r md:border-border">
            {controls}
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground md:hidden"
              onClick={() => setMobilePreview(open => !open)}
            >
              {mobilePreview ? 'Hide preview' : 'Show page preview'}
            </button>
            {mobilePreview ? <div className="mt-3 md:hidden">{preview}</div> : null}
          </div>
          <div className="hidden min-h-0 min-w-0 flex-1 md:flex">{preview}</div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          {error ? <p className="text-xs text-destructive">{error}</p> : <span className="hidden sm:block" />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-[2] sm:flex-none"
              disabled={busy || includedCount === 0}
              onClick={() => void download()}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Building PDF…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** @deprecated Use MasterExportDialog — kept so older imports keep compiling. */
export const MasterExportPanel = MasterExportDialog
