'use client'

import { scoreRingColor, scoreLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ATSScore } from '@/types'

interface MatchScoreProps {
  score: ATSScore
  compact?: boolean
}

export function MatchScore({ score, compact }: MatchScoreProps) {
  const safeTotal = Number.isFinite(score.total)
    ? Math.max(0, Math.min(100, Math.round(score.total)))
    : 0
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const progress = (safeTotal / 100) * circumference
  const color = scoreRingColor(safeTotal)

  return (
    <div className="space-y-4">
      {/* Circular gauge */}
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width={140} height={140} className="-rotate-90">
            <circle
              cx={70} cy={70} r={radius}
              stroke="hsl(var(--secondary))"
              strokeWidth={10}
              fill="none"
            />
            <circle
              cx={70} cy={70} r={radius}
              stroke={color}
              strokeWidth={10}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{safeTotal}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg" style={{ color }}>{scoreLabel(safeTotal)}</p>
          <p className="text-sm text-muted-foreground mt-0.5">ATS Match Score</p>

          {!compact && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(score.breakdown).map(([key, val]) => {
                const safeVal = Number.isFinite(val) ? val : 0
                return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 capitalize">{key}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${safeVal}%`, backgroundColor: scoreRingColor(safeVal) }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{safeVal}%</span>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <>
          {/* Missing keywords */}
          {score.missing_keywords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Missing Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {score.missing_keywords.slice(0, 12).map(kw => (
                  <Badge key={kw} variant="destructive">{kw}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Matched keywords */}
          {score.matched_keywords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Matched Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {score.matched_keywords.slice(0, 10).map(kw => (
                  <Badge key={kw} variant="success">{kw}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {score.recommendations.length > 0 && (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
              {score.recommendations.map((rec, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {rec}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
