import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const STEPS = [
  { label: 'Resume', description: 'Select' },
  { label: 'Job', description: 'Add' },
  { label: 'Score', description: 'Review' },
  { label: 'Q&A', description: 'Fill Gaps' },
  { label: 'Result', description: 'Tailored' },
]

interface TailorStepperProps {
  currentStep: number
}

export function TailorStepper({ currentStep }: TailorStepperProps) {
  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const done = stepNum < currentStep
          const active = stepNum === currentStep

          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  done && 'bg-brand-green text-white',
                  active && 'bg-brand-purple text-white ring-2 ring-brand-purple/30',
                  !done && !active && 'bg-secondary text-muted-foreground'
                )}>
                  {done ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <div className="mt-1.5 text-center">
                  <p className={cn('text-xs font-medium', active ? 'text-white' : 'text-muted-foreground')}>{step.label}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-2', done ? 'bg-brand-green' : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: just show current step text */}
      <div className="sm:hidden flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1]?.label}
        </p>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i + 1 <= currentStep ? 'bg-brand-purple w-4' : 'bg-secondary w-1.5'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
