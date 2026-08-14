'use client'

import { checkResumeHealth } from '@/lib/resume/health'
import { profileDataToStructuredResume } from '@/lib/profile/data'
import { cn, scoreColor } from '@/lib/utils'
import { describeResumeChange, changeLocationLabel } from '@/lib/tailor/change-copy'
import type { ATSScore, ProfileData, ResumeDiffChange } from '@/types'

interface AnalyzerPanelProps {
  data: ProfileData
  score?: ATSScore | null
  changes?: ResumeDiffChange[]
  selectedChangeId?: string | null
  onSelectChange?: (id: string | null) => void
}

function asText(value: string | string[] | undefined): string {
  if (!value) return ''
  return Array.isArray(value) ? value.filter(Boolean).join('\n') : value
}

export function AnalyzerPanel({
  data,
  score = null,
  changes = [],
  selectedChangeId = null,
  onSelectChange,
}: AnalyzerPanelProps) {
  const structured = profileDataToStructuredResume(data)
  const checks = checkResumeHealth({ data: structured, pageCount: 1, recommendedPages: 1 })
  const issues = checks.filter(c => c.severity !== 'good')
  const jobMode = Boolean(score)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{jobMode ? 'Match' : 'Analyzer'}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {jobMode
            ? 'What changed for this job, what ATS still wants, and whether a recruiter can skim it.'
            : issues.length === 0
              ? 'Looking solid — no major issues.'
              : `${issues.length} issue${issues.length === 1 ? '' : 's'} to review on your master resume.`}
        </p>
      </div>

      {score ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Job match</p>
              <p className={cn('text-3xl font-bold tabular-nums', scoreColor(score.total))}>{score.total}%</p>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-0.5 text-right">
              <li>Keywords {score.breakdown.keywords}%</li>
              <li>Skills {score.breakdown.skills}%</li>
              <li>Experience {score.breakdown.experience}%</li>
            </ul>
          </div>
          {score.missing_skills.length > 0 || score.missing_keywords.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">Still missing on this draft</p>
              <div className="flex flex-wrap gap-1.5">
                {[...score.missing_skills, ...score.missing_keywords].slice(0, 12).map(item => (
                  <span
                    key={item}
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Add only if you actually used them — tap the teal pen on Content to write it into a real bullet.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">ATS found the listed skills and keywords in this draft.</p>
          )}
        </div>
      ) : null}

      {jobMode ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">What was updated</h3>
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tracked edits yet. Tailor this job or use the pen on Content — changes show here and on the preview.
            </p>
          ) : (
            <ul className="space-y-2">
              {changes.map((change, i) => {
                const id = change.id ?? `${change.section}-${change.expId ?? change.projId ?? i}`
                const selected = selectedChangeId === id
                const before = asText(change.before)
                const after = asText(change.after)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onSelectChange?.(selected ? null : id)}
                      className={cn(
                        'w-full text-left rounded-xl border px-3 py-2.5 transition-colors',
                        selected
                          ? 'border-teal-600 bg-teal-600/10'
                          : 'border-border bg-card/60 hover:bg-secondary/40'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                          {changeLocationLabel(change)}
                          {change.changeType ? ` · ${change.changeType}` : ''}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {selected ? 'Showing on preview' : 'Tap to highlight'}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">{describeResumeChange(change)}</p>
                      {before && after && before !== after ? (
                        <div className="mt-2 grid gap-1.5 text-[11px] leading-snug">
                          <p className="text-muted-foreground line-through decoration-red-400/70">
                            {before.length > 220 ? `${before.slice(0, 220)}…` : before}
                          </p>
                          <p className="text-foreground">
                            {after.length > 220 ? `${after.slice(0, 220)}…` : after}
                          </p>
                        </div>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-foreground">{jobMode ? 'Format check' : 'Health'}</h3>
        <ul className="space-y-2 mt-2">
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
    </div>
  )
}
