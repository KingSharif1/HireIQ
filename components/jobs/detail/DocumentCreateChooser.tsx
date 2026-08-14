'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { FileEdit, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DocumentCreateChooserProps = {
  kind: 'resume' | 'cover'
  onAi: () => void
  onManual: () => void
  onClose: () => void
}

export function DocumentCreateChooser({ kind, onAi, onManual, onClose }: DocumentCreateChooserProps) {
  const reduceMotion = useReducedMotion()
  const isResume = kind === 'resume'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pb-20 md:pb-0 md:left-[68px]">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-foreground">
            {isResume ? 'New resume for this job' : 'New cover letter'}
          </h1>
          <p className="text-xs text-muted-foreground">Pick how you want to start</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
          <ChoiceCard
            reduceMotion={reduceMotion}
            delay={0}
            icon={Sparkles}
            title={isResume ? 'Tailor with AI' : 'Generate with AI'}
            description={
              isResume
                ? 'We read the job, your profile, and suggest edits you accept or decline.'
                : 'Draft a letter from your resume and this job — edit before saving.'
            }
            accent="teal"
            onClick={onAi}
          />
          <ChoiceCard
            reduceMotion={reduceMotion}
            delay={0.06}
            icon={FileEdit}
            title={isResume ? 'Build it myself' : 'Write it myself'}
            description={
              isResume
                ? 'Pick sections, tweak wording, and see your match score live.'
                : 'Start from a blank page and save when you are ready.'
            }
            accent="neutral"
            onClick={onManual}
          />
        </div>
      </div>
    </div>
  )
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  accent,
  onClick,
  delay,
  reduceMotion,
}: {
  icon: typeof Sparkles
  title: string
  description: string
  accent: 'teal' | 'neutral'
  onClick: () => void
  delay: number
  reduceMotion: boolean | null
}) {
  return (
    <motion.button
      type="button"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start rounded-2xl border p-5 text-left transition-shadow',
        accent === 'teal'
          ? 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10'
          : 'border-border bg-card hover:border-foreground/20 hover:shadow-md'
      )}
    >
      <span
        className={cn(
          'mb-4 flex h-11 w-11 items-center justify-center rounded-xl border',
          accent === 'teal'
            ? 'border-teal-500/25 bg-teal-500/15 text-teal-700 dark:text-teal-200'
            : 'border-border bg-secondary text-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-base font-semibold text-foreground">{title}</span>
      <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</span>
      <span
        className={cn(
          'mt-4 text-xs font-medium',
          accent === 'teal' ? 'text-teal-700 dark:text-teal-300' : 'text-muted-foreground'
        )}
      >
        Continue →
      </span>
    </motion.button>
  )
}
