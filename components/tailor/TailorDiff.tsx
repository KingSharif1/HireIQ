'use client'

import { diffWords } from 'diff'
import type { ResumeDiffChange, StructuredResume } from '@/types'

interface TailorDiffProps {
  original: StructuredResume
  tailored: StructuredResume
  changes: ResumeDiffChange[]
}

function DiffBullet({ before, after }: { before: string; after: string }) {
  const parts = diffWords(before, after)

  return (
    <div className="flex gap-3 text-sm">
      <span className="text-muted-foreground text-xs w-16 flex-shrink-0 mt-0.5 font-mono">before</span>
      <p className="text-muted-foreground line-through">{before}</p>
    </div>
  )
}

export function TailorDiff({ original, tailored, changes }: TailorDiffProps) {
  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No major structural changes — keywords and phrasing were optimized.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {changes.slice(0, 5).map((change, i) => {
        if (change.section === 'summary') {
          return (
            <div key={i} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</p>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-muted-foreground line-through">{change.before as string}</p>
              </div>
              <div className="bg-brand-green/5 border border-brand-green/20 rounded-lg p-3">
                <p className="text-sm text-foreground">{change.after as string}</p>
              </div>
            </div>
          )
        }

        if (change.section === 'experience') {
          const expId = change.expId
          const origExp = original.experience.find(e => e.id === expId)
          const tailoredExp = tailored.experience.find(e => e.id === expId)

          return (
            <div key={i} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {origExp?.title} @ {origExp?.company}
              </p>
              <div className="space-y-1.5">
                {(change.after as string[]).slice(0, 3).map((bullet, j) => {
                  const origBullet = (change.before as string[])[j] || ''
                  const changed = bullet !== origBullet

                  return (
                    <div key={j} className={`rounded-lg p-2.5 text-sm ${
                      changed
                        ? 'bg-brand-green/5 border border-brand-green/20'
                        : 'bg-secondary/30'
                    }`}>
                      <p className="text-foreground">{bullet}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
