'use client'

import { GripVertical } from 'lucide-react'
import type { ResumeTheme } from '@/lib/export/theme'
import { ControlBlock, FieldLabel } from './controls'

interface Props {
  theme: ResumeTheme
  onChange: (patch: Partial<ResumeTheme>) => void
}

export function SectionsTab({ theme, onChange }: Props) {
  function move(index: number, dir: -1 | 1) {
    const next = [...theme.sectionOrder]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ sectionOrder: next })
  }

  function rename(key: string, label: string) {
    onChange({
      sectionLabels: {
        ...theme.sectionLabels,
        [key]: label,
      },
    })
  }

  return (
    <div className="space-y-3">
      <ControlBlock title="Section Order & Naming">
        <p className="text-xs text-muted-foreground -mt-1">
          Reorder sections and rename headings. Changes update the live preview.
        </p>
        <ul className="space-y-2">
          {theme.sectionOrder.map((key, i) => (
            <li
              key={key}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-2 py-2"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <FieldLabel>{key}</FieldLabel>
                <input
                  value={theme.sectionLabels[key] ?? key}
                  onChange={(e) => rename(key, e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-input px-2 text-sm text-foreground"
                  aria-label={`Label for ${key}`}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move ${key} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === theme.sectionOrder.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move ${key} down`}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      </ControlBlock>
    </div>
  )
}
