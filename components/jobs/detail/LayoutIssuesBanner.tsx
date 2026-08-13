'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadBlob, exportDOCX, exportPDF } from '@/lib/api/client'
import { runResumeLayoutCheck, type LayoutCheckIssue } from '@/lib/resume/layout-check'
import { cn } from '@/lib/utils'
import type { StructuredResume } from '@/types'

function severityClass(severity: LayoutCheckIssue['severity']): string {
  if (severity === 'critical') return 'border-destructive/30 bg-destructive/5 text-destructive'
  if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200'
  return 'border-border bg-muted/40 text-muted-foreground'
}

export function LayoutIssuesBanner({
  resume,
  pageCount,
  fonts,
}: {
  resume: StructuredResume
  pageCount?: number
  fonts?: { bodyFontSize?: number; nameFontSize?: number; lineHeight?: number }
}) {
  const bodyFontSize = fonts?.bodyFontSize
  const nameFontSize = fonts?.nameFontSize
  const lineHeight = fonts?.lineHeight
  const result = useMemo(
    () =>
      runResumeLayoutCheck(resume, {
        pageCount,
        fonts: { bodyFontSize, nameFontSize, lineHeight },
      }),
    [resume, pageCount, bodyFontSize, nameFontSize, lineHeight],
  )
  if (result.issues.length === 0) return null

  const critical = result.issues.filter(issue => issue.severity === 'critical')
  const rest = result.issues.filter(issue => issue.severity !== 'critical')

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Export check
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {critical.length
          ? 'Fix critical issues before PDF/DOCX export.'
          : 'Warnings will not block export — review them if you want a tighter one-page layout.'}
      </p>
      <ul className="mt-3 space-y-2">
        {[...critical, ...rest].map(issue => (
          <li
            key={issue.id}
            className={cn('rounded-lg border px-3 py-2 text-sm', severityClass(issue.severity))}
          >
            <p className="font-medium text-foreground">{issue.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{issue.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DocumentExportActions({
  tailoredResumeId,
  fileStem,
  resume,
}: {
  tailoredResumeId: string
  fileStem: string
  resume: StructuredResume
}) {
  const layout = useMemo(() => runResumeLayoutCheck(resume), [resume])
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const blocked = !layout.ok

  async function handleExport(format: 'pdf' | 'docx') {
    if (blocked) {
      setError('Fix critical layout issues before exporting.')
      return
    }
    setBusy(format)
    setError(null)
    try {
      const blob = format === 'pdf' ? await exportPDF(tailoredResumeId) : await exportDOCX(tailoredResumeId)
      downloadBlob(blob, `${fileStem}.${format}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null || blocked}
          onClick={() => void handleExport('pdf')}
        >
          {busy === 'pdf' ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
          PDF
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null || blocked}
          onClick={() => void handleExport('docx')}
        >
          {busy === 'docx' ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
          DOCX
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
