import { describeApplyEaseForUi, type ApplyEase } from '@/lib/apply/ease'
import { cn } from '@/lib/utils'
import { CheckCircle2, HelpCircle, ShieldAlert } from 'lucide-react'

type Props = {
  ease?: ApplyEase | null
  reason?: string | null
  compact?: boolean
  className?: string
}

export function ApplyEaseBadge({ ease, reason, compact = false, className }: Props) {
  if (!ease) return null

  const copy = describeApplyEaseForUi({ ease, reason: reason || '' })
  const Icon = ease === 'easy' ? CheckCircle2 : ease === 'hard' ? ShieldAlert : HelpCircle

  const toneClass =
    copy.tone === 'positive'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300'
      : copy.tone === 'caution'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
        : 'border-border bg-secondary/50 text-muted-foreground'

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2',
        toneClass,
        compact ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('mt-0.5 shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{copy.title}</p>
          {!compact ? <p className="mt-0.5 text-muted-foreground">{copy.detail}</p> : null}
        </div>
      </div>
    </div>
  )
}
