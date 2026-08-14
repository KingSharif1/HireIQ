'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  applyDensity,
  inferDensity,
  type ResumeDensity,
  type ResumeTheme,
  DEFAULT_RESUME_THEME,
} from '@/lib/export/theme'
import { PresentationTab } from './PresentationTab'
import { SectionsTab } from './SectionsTab'
import { SettingsTab } from './SettingsTab'
import { AdvancedTab } from './AdvancedTab'

const DENSITY_OPTIONS: { id: ResumeDensity; label: string; hint: string }[] = [
  { id: 'compact', label: 'Compact', hint: 'More on one page' },
  { id: 'standard', label: 'Standard', hint: 'Default' },
  { id: 'spacious', label: 'Spacious', hint: 'Easier to read' },
]

interface DesignerPanelProps {
  theme: ResumeTheme
  onChange: (patch: Partial<ResumeTheme>) => void
  onReset?: () => void
}

export function DesignerPanel({ theme, onChange, onReset }: DesignerPanelProps) {
  const density = inferDensity(theme)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Designer</h2>
          <p className="text-xs text-muted-foreground">
            Size, section order, and layout — live preview updates as you edit.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (onReset) onReset()
            else onChange({ ...DEFAULT_RESUME_THEME })
          }}
        >
          Reset default
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">Size template</p>
        <div className="grid grid-cols-3 gap-2">
          {DENSITY_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(applyDensity(theme, option.id))}
              className={cn(
                'rounded-lg border px-2 py-2.5 text-center min-h-[3.25rem]',
                density === option.id
                  ? 'border-teal-600 bg-teal-600/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="block text-xs font-semibold">{option.label}</span>
              <span className="block text-[10px] mt-0.5">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="sections" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="presentation" className="text-xs sm:text-sm">
            Presentation
          </TabsTrigger>
          <TabsTrigger value="sections" className="text-xs sm:text-sm">
            Sections
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">
            Settings
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs sm:text-sm">
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presentation" className="mt-3">
          <PresentationTab theme={theme} onChange={onChange} />
        </TabsContent>
        <TabsContent value="sections" className="mt-3">
          <SectionsTab theme={theme} onChange={onChange} />
        </TabsContent>
        <TabsContent value="settings" className="mt-3">
          <SettingsTab theme={theme} onChange={onChange} />
        </TabsContent>
        <TabsContent value="advanced" className="mt-3">
          <AdvancedTab theme={theme} onChange={onChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
