'use client'

import type { ResumeTheme } from '@/lib/export/theme'
import {
  ACCENT_SWATCHES,
  ChoiceCards,
  ControlBlock,
  FieldLabel,
  PDF_SAFE_FONTS,
  SliderField,
} from './controls'
import { cn } from '@/lib/utils'

interface Props {
  theme: ResumeTheme
  onChange: (patch: Partial<ResumeTheme>) => void
}

export function PresentationTab({ theme, onChange }: Props) {
  return (
    <div className="space-y-3">
      <ControlBlock title="Styling">
        <div>
          <FieldLabel>Font</FieldLabel>
          <select
            value={theme.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="w-full h-9 rounded-lg border border-border bg-input px-2 text-sm text-foreground"
          >
            {PDF_SAFE_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <SliderField
          label="Line Height"
          value={Math.round(theme.lineHeight * 100)}
          min={100}
          max={180}
          unit="%"
          onChange={(v) => onChange({ lineHeight: v / 100 })}
        />
        <SliderField
          label="List Line Height"
          value={Math.round(theme.listLineHeight * 100)}
          min={100}
          max={180}
          unit="%"
          onChange={(v) => onChange({ listLineHeight: v / 100 })}
        />

        <div>
          <FieldLabel>Accent Color</FieldLabel>
          <div className="flex flex-wrap gap-2 items-center">
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                onClick={() => onChange({ accentColor: c })}
                className={cn(
                  'w-7 h-7 rounded-full border-2 transition-transform',
                  theme.accentColor.toLowerCase() === c.toLowerCase()
                    ? 'border-foreground scale-110'
                    : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="relative w-7 h-7 rounded-full border border-border overflow-hidden cursor-pointer">
              <input
                type="color"
                value={theme.accentColor}
                onChange={(e) => onChange({ accentColor: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Custom accent color"
              />
              <span
                className="block w-full h-full"
                style={{
                  background:
                    'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                }}
              />
            </label>
          </div>
        </div>

        <div>
          <FieldLabel>Date Format</FieldLabel>
          <select
            value={theme.dateFormat}
            onChange={(e) =>
              onChange({ dateFormat: e.target.value as ResumeTheme['dateFormat'] })
            }
            className="w-full h-9 rounded-lg border border-border bg-input px-2 text-sm text-foreground"
          >
            <option value="MM/YYYY">Numbers (MM/YYYY)</option>
            <option value="MMM YYYY">Short (MMM YYYY)</option>
            <option value="MMMM YYYY">Long (MMMM YYYY)</option>
            <option value="YYYY">Year only (YYYY)</option>
          </select>
        </div>
      </ControlBlock>

      <ControlBlock title="Alignments & Layouts">
        <ChoiceCards
          label="Header Alignment"
          value={theme.headerAlign}
          onChange={(headerAlign) => onChange({ headerAlign })}
          options={[
            {
              value: 'left',
              label: 'Left',
              preview: (
                <div>
                  <div className="font-semibold text-foreground">Full Name</div>
                  <div>Info · Info</div>
                </div>
              ),
            },
            {
              value: 'center',
              label: 'Center',
              preview: (
                <div className="text-center">
                  <div className="font-semibold text-foreground">Full Name</div>
                  <div>Info · Info</div>
                </div>
              ),
            },
            {
              value: 'right',
              label: 'Right',
              preview: (
                <div className="text-right">
                  <div className="font-semibold text-foreground">Full Name</div>
                  <div>Info · Info</div>
                </div>
              ),
            },
          ]}
        />

        <ChoiceCards
          label="Date Alignment"
          value={theme.dateAlign}
          onChange={(dateAlign) => onChange({ dateAlign })}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
        />

        <ChoiceCards
          label="Location Alignment"
          value={theme.locationAlign}
          onChange={(locationAlign) => onChange({ locationAlign })}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
        />

        <ChoiceCards
          label="Skills Layout"
          value={theme.skillsLayout}
          onChange={(skillsLayout) => onChange({ skillsLayout })}
          options={[
            { value: 'categorized', label: 'By Category' },
            { value: 'comma', label: 'Comma Separated' },
            { value: 'comma-list', label: 'Comma Separated List' },
            { value: 'columns', label: 'Columns' },
          ]}
        />
      </ControlBlock>

      <ControlBlock title="Page Setup">
        <div>
          <FieldLabel>Paper Size</FieldLabel>
          <select
            value={theme.paperSize}
            disabled
            className="w-full h-9 rounded-lg border border-border bg-input px-2 text-sm text-foreground opacity-80"
          >
            <option value="letter">Letter (8.5 × 11 in)</option>
          </select>
        </div>
        <SliderField
          label="Left & Right Margins"
          value={theme.marginX}
          min={0.3}
          max={1.2}
          step={0.05}
          unit=" in"
          onChange={(marginX) => onChange({ marginX })}
        />
        <SliderField
          label="Top & Bottom Margins"
          value={theme.marginY}
          min={0.3}
          max={1.2}
          step={0.05}
          unit=" in"
          onChange={(marginY) => onChange({ marginY })}
        />
      </ControlBlock>
    </div>
  )
}
