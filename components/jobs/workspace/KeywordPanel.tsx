'use client'

import { Badge } from '@/components/ui/badge'
import type { ATSScore } from '@/types'

interface KeywordPanelProps {
  score: ATSScore | null
}

export function KeywordPanel({ score }: KeywordPanelProps) {
  if (!score) {
    return (
      <p className="text-sm text-muted-foreground">
        Tailor this job to see matched and missing keywords.
      </p>
    )
  }

  const hardMatched = score.matched_skills
  const hardMissing = score.missing_skills
  const softMatched = score.matched_keywords.filter(
    (kw) => !hardMatched.some((s) => s.toLowerCase() === kw.toLowerCase())
  )
  const softMissing = score.missing_keywords.filter(
    (kw) => !hardMissing.some((s) => s.toLowerCase() === kw.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <KeywordGroup
        title="Skills"
        matched={hardMatched}
        missing={hardMissing}
      />
      <KeywordGroup
        title="Keywords"
        matched={softMatched}
        missing={softMissing}
      />
    </div>
  )
}

function KeywordGroup({
  title,
  matched,
  missing,
}: {
  title: string
  matched: string[]
  missing: string[]
}) {
  const total = matched.length + missing.length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {matched.length} / {total || '—'}
        </span>
      </div>
      {matched.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matched.map((kw) => (
            <Badge key={`m-${kw}`} variant="success">{kw}</Badge>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {missing.map((kw) => (
            <Badge key={`x-${kw}`} variant="destructive">{kw}</Badge>
          ))}
        </div>
      )}
      {total === 0 && (
        <p className="text-xs text-muted-foreground">No keywords extracted for this job yet.</p>
      )}
    </div>
  )
}
