import { uid } from '@/lib/profile/data'
import { Button } from '@/components/ui/button'
import { Plus, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ProvenanceEntry } from '@/types'
import { formatProvenanceTimeline, getProvenanceLabel } from '@/lib/profile/provenance'

interface Props {
  bullets: string[]
  bulletIds: string[]
  provenance: Record<string, ProvenanceEntry>
  onChange: (bullets: string[], bulletIds: string[], edits: { bulletId: string; before: string; after: string }[]) => void
}

export function ProvenanceBulletEditor({ bullets, bulletIds, provenance, onChange }: Props) {
  const ids = bulletIds.length === bullets.length ? bulletIds : bullets.map((_, i) => bulletIds[i] ?? `bul-${i}`)

  function updateBullet(index: number, text: string) {
    const next = [...bullets]
    const before = bullets[index]
    next[index] = text
    const edits = before !== text ? [{ bulletId: ids[index], before, after: text }] : []
    onChange(next, ids, edits)
  }

  function removeBullet(index: number) {
    onChange(
      bullets.filter((_, j) => j !== index),
      ids.filter((_, j) => j !== index),
      []
    )
  }

  function addBullet() {
    const newId = uid('bul')
    onChange([...bullets, ''], [...ids, newId], [])
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {bullets.map((b, i) => {
          const entry = provenance[ids[i]]
          const label = getProvenanceLabel(entry)
          const fromTailor = entry?.origin === 'tailor'

          return (
            <div key={ids[i]} className="flex items-start gap-2">
              <span className="text-brand-purple mt-2.5 text-xs">•</span>
              <div className="flex-1 space-y-1">
                <textarea
                  value={b}
                  onChange={e => updateBullet(i, e.target.value)}
                  rows={2}
                  placeholder="Describe an accomplishment, impact, or responsibility…"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors',
                    fromTailor
                      ? 'border-brand-purple/40 bg-brand-purple/5'
                      : 'border-input bg-input'
                  )}
                />
                {label && entry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 text-[10px] text-brand-purple cursor-help">
                        <Info className="w-3 h-3" />
                        {label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <ul className="text-xs space-y-1">
                        {formatProvenanceTimeline(entry).map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeBullet(i)}
                className="text-muted-foreground hover:text-destructive p-1.5 mt-1 rounded-md hover:bg-destructive/10 transition-colors"
                aria-label="Remove bullet"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
        <Button type="button" variant="ghost" size="sm" onClick={addBullet}>
          <Plus className="w-3.5 h-3.5" />
          Add bullet
        </Button>
      </div>
    </TooltipProvider>
  )
}
