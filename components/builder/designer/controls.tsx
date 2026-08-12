'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-foreground mb-1.5">{children}</p>
}

export function ControlBlock({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-border bg-card/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground flex items-center justify-between">
        {title}
        <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-border/60 pt-3">{children}</div>
    </details>
  )
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--brand-purple))] h-2"
        aria-label={label}
      />
    </div>
  )
}

export function ChoiceCards<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; preview?: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-left transition-colors',
              value === opt.value
                ? 'border-brand-purple bg-brand-purple/10'
                : 'border-border hover:border-brand-purple/40 bg-card/30'
            )}
          >
            {opt.preview ? <div className="mb-2 text-[10px] text-muted-foreground">{opt.preview}</div> : null}
            <span className="text-xs font-medium text-foreground">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export const ACCENT_SWATCHES = [
  '#333333',
  '#1a1a1a',
  '#0f766e',
  '#1d4ed8',
  '#7c3aed',
  '#b45309',
  '#be123c',
  '#166534',
] as const

export const PDF_SAFE_FONTS = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times-Roman', label: 'Times' },
  { value: 'Courier', label: 'Courier' },
] as const
