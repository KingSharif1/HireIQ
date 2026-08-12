'use client'

import { checkResumeHealth } from '@/lib/resume/health'
import { profileDataToStructuredResume } from '@/lib/profile/data'
import { cn } from '@/lib/utils'
import type { ProfileData } from '@/types'

interface AnalyzerPanelProps {
  data: ProfileData
}

export function AnalyzerPanel({ data }: AnalyzerPanelProps) {
  const structured = profileDataToStructuredResume(data)
  const checks = checkResumeHealth({ data: structured, pageCount: 1, recommendedPages: 1 })
  const issues = checks.filter(c => c.severity !== 'good')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Analyzer</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {issues.length === 0
            ? 'Looking solid — no major issues.'
            : `${issues.length} issue${issues.length === 1 ? '' : 's'} to review on your master resume.`}
        </p>
      </div>
      <ul className="space-y-2">
        {checks.map(c => (
          <li
            key={c.id}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-sm',
              c.severity === 'good' && 'border-brand-green/30 bg-brand-green/5',
              c.severity === 'warn' && 'border-brand-amber/30 bg-brand-amber/5',
              c.severity === 'bad' && 'border-destructive/30 bg-destructive/5'
            )}
          >
            <p className="font-medium text-foreground">{c.label}</p>
            {c.detail && <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
