'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChevronRight, Info, SkipForward, Lightbulb, Check, Pencil, Sparkles } from 'lucide-react'
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
  const [showWrite, setShowWrite] = useState(false)
  const [showExample, setShowExample] = useState(false)

  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const answeredCount = Object.values(answers).filter(v => v?.trim()).length

  if (!current) return null

  const value = answers[current.id] || ''
  const choices = current.choices ?? []
  // A typed answer that isn't one of the suggested choices means the user wrote their own.
  const isCustom = Boolean(value.trim()) && !choices.includes(value)
  const hasAnswer = Boolean(value.trim())

  function resetPerQuestionUI() {
    setShowTip(false)
    setShowExample(false)
    setShowWrite(false)
  }

  function handleNext() {
    if (isLast) {
      onComplete()
    } else {
      setCurrentIndex(i => i + 1)
      resetPerQuestionUI()
    }
  }

  function handlePickChoice(choice: string) {
    // Toggle off if the same choice is tapped again.
    onAnswer(current.id, value === choice ? '' : choice)
  }

  function handleUseExample() {
    onAnswer(current.id, current.example_answer || '')
    setShowWrite(true)
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span>{answeredCount} answered</span>
      </div>

      <div className="flex gap-1">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={cn(
              'flex-1 h-1.5 rounded-full transition-colors',
              i === currentIndex
                ? 'bg-brand-purple'
                : answers[q.id]?.trim()
                  ? 'bg-brand-purple/50'
                  : 'bg-secondary'
            )}
          />
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-5 space-y-5">
          {/* Question */}
          <div className="space-y-2">
            <Badge variant="secondary" className="capitalize">{current.category}</Badge>
            <p className="text-base font-semibold text-foreground leading-snug">{current.question}</p>
          </div>

          {/* Quick-pick choices (hybrid) */}
          {choices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick answers — tap one, or write your own below</p>
              <div className="flex flex-wrap gap-2">
                {choices.map(choice => {
                  const active = value === choice
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handlePickChoice(choice)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all',
                        active
                          ? 'border-brand-purple bg-brand-purple/15 text-brand-purple'
                          : 'border-border text-foreground hover:border-brand-purple/50 hover:bg-secondary/60'
                      )}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      {choice}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Example answer */}
          {current.example_answer && (
            <div>
              <button
                type="button"
                onClick={() => setShowExample(s => !s)}
                className="flex items-center gap-1.5 text-xs text-brand-amber hover:opacity-80 transition-opacity"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {showExample ? 'Hide example' : 'See an example answer'}
              </button>
              {showExample && (
                <div className="mt-2 rounded-lg border border-brand-amber/20 bg-brand-amber/5 p-3 space-y-2">
                  <p className="text-sm text-muted-foreground italic leading-relaxed">“{current.example_answer}”</p>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleUseExample}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Start from this
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Write your own / talk it through */}
          {!showWrite && choices.length > 0 && !isCustom ? (
            <button
              type="button"
              onClick={() => setShowWrite(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Write my own answer
            </button>
          ) : (
            <div className="space-y-1.5">
              {choices.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground">In your own words</p>
              )}
              <Textarea
                placeholder="Add detail in your own words… the more specific, the better we can tailor."
                value={value}
                onChange={(e) => onAnswer(current.id, e.target.value)}
                className="min-h-[110px]"
                autoFocus={showWrite}
              />
            </div>
          )}

          {/* Why it matters */}
          <button
            type="button"
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
        <Button variant="outline" size="sm" onClick={handleNext} className="gap-1.5">
          <SkipForward className="w-3.5 h-3.5" />
          Skip
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 gap-1.5"
          disabled={!hasAnswer && !isLast}
        >
          {isLast ? 'Generate tailored resume' : 'Next question'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
