'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { GapAnalysis } from '@/types'
import { CheckCircle2, AlertTriangle, MinusCircle, HelpCircle } from 'lucide-react'

interface GapAnalysisSummaryProps {
  analysis: GapAnalysis
}

export function GapAnalysisSummary({ analysis }: GapAnalysisSummaryProps) {
  const { direct_matches, adjacent_matches, real_gaps } = analysis

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        How your profile lines up with this role before we tailor.
      </p>

      {direct_matches.length > 0 && (
        <Card className="border-brand-green/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-green" />
              <h3 className="text-sm font-semibold text-foreground">Direct matches</h3>
              <Badge variant="muted" className="ml-auto">{direct_matches.length}</Badge>
            </div>
            <ul className="space-y-2">
              {direct_matches.map((m, i) => (
                <li key={i} className="text-sm space-y-0.5">
                  <p className="font-medium text-foreground">{m.jd_requirement}</p>
                  <p className="text-xs text-muted-foreground">{m.user_evidence}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {adjacent_matches.length > 0 && (
        <Card className="border-brand-amber/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-brand-amber" />
              <h3 className="text-sm font-semibold text-foreground">Adjacent matches</h3>
              <Badge variant="muted" className="ml-auto">{adjacent_matches.length}</Badge>
            </div>
            <ul className="space-y-2">
              {adjacent_matches.map((m, i) => (
                <li key={i} className="text-sm space-y-1 rounded-lg bg-secondary/30 p-2.5">
                  <p className="font-medium text-foreground">{m.jd_requirement}</p>
                  <p className="text-xs text-muted-foreground">{m.user_evidence}</p>
                  <p className="text-xs text-brand-amber">
                    Honest framing: {m.honest_framing}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {real_gaps.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Real gaps</h3>
              <Badge variant="muted" className="ml-auto">{real_gaps.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              These won&apos;t be claimed on your resume — we&apos;ll focus on what you actually have.
            </p>
            <ul className="space-y-2">
              {real_gaps.map((g, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium text-foreground">{g.jd_requirement}</p>
                  <p className="text-xs text-muted-foreground">{g.note}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.questions_for_user.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg border border-border p-3">
          <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            {analysis.questions_for_user.length} quick question
            {analysis.questions_for_user.length === 1 ? '' : 's'} below — only for things we
            couldn&apos;t verify from your profile.
          </p>
        </div>
      )}
    </div>
  )
}
