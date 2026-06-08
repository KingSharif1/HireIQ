'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Info, SkipForward } from 'lucide-react'
import type { GapQuestion } from '@/types'

interface QuestionFlowProps {
  questions: GapQuestion[]
  answers: Record<string, string>
  onAnswer: (questionId: string, answer: string) => void
  onComplete: () => void
}

export function QuestionFlow({ questions, answers, onAnswer, onComplete }: QuestionFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showTip, setShowTip] = useState(false)

  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const answeredCount = Object.values(answers).filter(Boolean).length

  function handleNext() {
    if (isLast) {
      onComplete()
    } else {
      setCurrentIndex(i => i + 1)
      setShowTip(false)
    }
  }

  if (!current) return null

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </p>
        <p className="text-muted-foreground">
          {answeredCount} answered
        </p>
      </div>

      <div className="flex gap-1 mb-2">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= currentIndex ? 'bg-brand-purple' : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Badge variant="secondary" className="mb-3">{current.category}</Badge>
            <p className="font-medium text-foreground leading-snug">{current.question}</p>
          </div>

          <Textarea
            placeholder="Answer here… (skip if not applicable)"
            value={answers[current.id] || ''}
            onChange={(e) => onAnswer(current.id, e.target.value)}
            className="min-h-[120px]"
          />

          {/* Why it matters toggle */}
          <button
            onClick={() => setShowTip(!showTip)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Why does this matter?
          </button>

          {showTip && (
            <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
              {current.why_it_matters}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          className="gap-1.5"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 gap-1.5"
          disabled={!answers[current.id]?.trim() && !isLast}
        >
          {isLast ? 'Generate Tailored Resume' : 'Next Question'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
