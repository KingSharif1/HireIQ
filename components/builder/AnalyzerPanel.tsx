'use client'

import { checkResumeHealth } from '@/lib/resume/health'
import { profileDataToStructuredResume } from '@/lib/profile/data'
import { cn, scoreColor } from '@/lib/utils'
import {
  describeResumeChange,
  changeLocationLabel,
  isNewAddition,
} from '@/lib/tailor/change-copy'
import { buildOptimizationBrief } from '@/lib/tailor/optimization-brief'
import type {
  ATSScore,
  ChangeDecision,
  JobExtractedData,
  ProfileData,
  ResumeDiffChange,
} from '@/types'
import { Check, X } from 'lucide-react'

interface AnalyzerPanelProps {
  data: ProfileData
  score?: ATSScore | null
  job?: JobExtractedData | null
  changes?: ResumeDiffChange[]
  selectedChangeId?: string | null
  onSelectChange?: (id: string | null) => void
  decisions?: Record<string, ChangeDecision>
  onDecision?: (id: string, status: 'accepted' | 'declined') => void
}

function asText(value: string | string[] | undefined): string {
  if (!value) return ''
  return Array.isArray(value) ? value.filter(Boolean).join('\n') : value
}

export function AnalyzerPanel({
  data,
  score = null,
  job = null,
  changes = [],
  selectedChangeId = null,
  onSelectChange,
  decisions = {},
  onDecision,
}: AnalyzerPanelProps) {
  const structured = profileDataToStructuredResume(data)
  const checks = checkResumeHealth({ data: structured, pageCount: 1, recommendedPages: 1 })
  const issues = checks.filter(c => c.severity !== 'good')
  const jobMode = Boolean(score || job || changes.length > 0)
  const brief = buildOptimizationBrief(score, changes, job)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{jobMode ? 'Match' : 'Analyzer'}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {jobMode
            ? brief.headline
            : issues.length === 0
              ? 'Looking solid — no major issues.'
              : `${issues.length} issue${issues.length === 1 ? '' : 's'} to review on your master resume.`}
        </p>
      </div>

      {jobMode ? (
        <div className="rounded-xl border border-teal-600/25 bg-teal-600/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">How this helps your interview odds</p>
          <p className="text-sm text-foreground/90">{brief.oddsLine}</p>
          {brief.bullets.length > 0 ? (
            <ul className="space-y-1.5 mt-2">
              {brief.bullets.map(line => (
                <li key={line} className="text-xs text-muted-foreground leading-snug pl-3 relative before:absolute before:left-0 before:content-['•']">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

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
                Add only if you actually used them — tap Edit on Content and write it into a real bullet.
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
          <p className="text-[11px] text-muted-foreground">
            Tap a change to highlight it on the preview (and jump to Preview on mobile). New additions need Accept; rewrites of what you already had are kept automatically.
          </p>
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tracked edits yet. Tailor this job or use Edit on Content — changes show here and on the preview.
            </p>
          ) : (
            <ul className="space-y-2">
              {changes.map((change, i) => {
                const id = change.id ?? `${change.section}-${change.expId ?? change.projId ?? i}`
                const selected = selectedChangeId === id
                const before = asText(change.before)
                const after = asText(change.after)
                const needsAccept = isNewAddition(change)
                const status = decisions[id]?.status ?? (needsAccept ? 'pending' : 'accepted')
                return (
                  <li key={id} className="space-y-1.5">
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
                          {needsAccept ? ' · New' : change.changeType ? ` · ${change.changeType}` : ''}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {selected ? 'On preview' : 'Highlight'}
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
                    {needsAccept && status === 'pending' && onDecision ? (
                      <div className="flex gap-2 px-1">
                        <button
                          type="button"
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-teal-600 px-2 py-1.5 text-xs font-medium text-white"
                          onClick={() => onDecision(id, 'accepted')}
                        >
                          <Check className="h-3.5 w-3.5" /> Accept new
                        </button>
                        <button
                          type="button"
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground"
                          onClick={() => onDecision(id, 'declined')}
                        >
                          <X className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    ) : null}
                    {needsAccept && status === 'accepted' ? (
                      <p className="px-1 text-[10px] text-teal-700 dark:text-teal-400">Accepted — stays on this resume</p>
                    ) : null}
                    {needsAccept && status === 'declined' ? (
                      <p className="px-1 text-[10px] text-muted-foreground">Removed from this draft</p>
                    ) : null}
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
