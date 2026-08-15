'use client'

import { useMemo, useState } from 'react'
import { Download, GripVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { isIncluded, toggleInclusionId } from '@/lib/profile/inclusion'
import { displaySkills } from '@/lib/profile/skills'
import type { ProfileData, ResumeInclusion } from '@/types'

const EXPORT_SECTIONS = [...DEFAULT_SECTION_ORDER]

type MasterExportPanelProps = {
  data: ProfileData
  savedTheme?: ResumeTheme | null
}

/**
 * Master profile export: pick sections, reorder, size template, download PDF.
 * Does not write the master profile — export-only controls.
 */
export function MasterExportPanel({ data, savedTheme = null }: MasterExportPanelProps) {
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
  const density = inferDensity(theme)

  const sectionOrder = theme.sectionOrder.length ? theme.sectionOrder : [...EXPORT_SECTIONS]

  const includedCount = useMemo(() => {
    return sectionOrder.filter(id => isIncluded(inclusion, 'section', id)).length
  }, [inclusion, sectionOrder])

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
            sectionIds: sectionOrder.filter(id => isIncluded(inclusion, 'section', id)),
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

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Export master resume</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose sections, order, and size — then download a PDF of your full profile. Job-tailored
          exports still live on each application’s Documents tab.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">Size</p>
        <div className="grid grid-cols-3 gap-2">
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
                'rounded-lg border px-2 py-2 text-xs font-semibold',
                density === id
                  ? 'border-teal-600 bg-teal-600/10 text-foreground'
                  : 'border-border text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">
          Sections ({includedCount} included)
        </p>
        <ul className="space-y-2">
          {sectionOrder.map((key, i) => (
            <li
              key={key}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="checkbox"
                className="rounded border-border"
                checked={isIncluded(inclusion, 'section', key)}
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
          ))}
        </ul>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button type="button" className="w-full sm:w-auto" disabled={busy || includedCount === 0} onClick={() => void download()}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building PDF…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </>
        )}
      </Button>
    </div>
  )
}
