'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { DEFAULT_RESUME_THEME, type ResumeTheme } from '@/lib/export/theme'
import { PresentationTab } from './PresentationTab'
import { SectionsTab } from './SectionsTab'
import { SettingsTab } from './SettingsTab'
import { AdvancedTab } from './AdvancedTab'

interface DesignerPanelProps {
  theme: ResumeTheme
  onChange: (patch: Partial<ResumeTheme>) => void
  onReset?: () => void
}

export function DesignerPanel({ theme, onChange, onReset }: DesignerPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Designer</h2>
          <p className="text-xs text-muted-foreground">
            Visual theme only — color, shape, typography, spacing. Live preview updates as you edit.
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

      <Tabs defaultValue="presentation" className="w-full">
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
