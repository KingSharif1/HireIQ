'use client'

import type { ResumeTheme } from '@/lib/export/theme'
import { ControlBlock, SliderField } from './controls'

interface Props {
  theme: ResumeTheme
  onChange: (patch: Partial<ResumeTheme>) => void
}

export function AdvancedTab({ theme, onChange }: Props) {
  return (
    <div className="space-y-3">
      <ControlBlock title="Font Size">
        <SliderField
          label="Name"
          value={theme.nameFontSize}
          min={14}
          max={32}
          onChange={(nameFontSize) => onChange({ nameFontSize })}
        />
        <SliderField
          label="Body"
          value={theme.bodyFontSize}
          min={8}
          max={14}
          step={0.5}
          onChange={(bodyFontSize) => onChange({ bodyFontSize })}
        />
      </ControlBlock>

      <ControlBlock title="Entry Spacing">
        <SliderField
          label="Section"
          value={theme.entrySpacing.section}
          min={4}
          max={28}
          onChange={(section) =>
            onChange({ entrySpacing: { ...theme.entrySpacing, section } })
          }
        />
        <SliderField
          label="Experience"
          value={theme.entrySpacing.experience}
          min={2}
          max={20}
          onChange={(experience) =>
            onChange({ entrySpacing: { ...theme.entrySpacing, experience } })
          }
        />
        <SliderField
          label="Education"
          value={theme.entrySpacing.education}
          min={2}
          max={20}
          onChange={(education) =>
            onChange({ entrySpacing: { ...theme.entrySpacing, education } })
          }
        />
        <SliderField
          label="Projects"
          value={theme.entrySpacing.project}
          min={2}
          max={20}
          onChange={(project) =>
            onChange({ entrySpacing: { ...theme.entrySpacing, project } })
          }
        />
      </ControlBlock>

      <ControlBlock title="Content Spacing">
        <SliderField
          label="Heading"
          value={theme.contentSpacing.heading}
          min={0}
          max={16}
          onChange={(heading) =>
            onChange({ contentSpacing: { ...theme.contentSpacing, heading } })
          }
        />
        <SliderField
          label="Subheading"
          value={theme.contentSpacing.subheading}
          min={0}
          max={12}
          onChange={(subheading) =>
            onChange({ contentSpacing: { ...theme.contentSpacing, subheading } })
          }
        />
        <SliderField
          label="Body"
          value={theme.contentSpacing.body}
          min={0}
          max={16}
          onChange={(body) =>
            onChange({ contentSpacing: { ...theme.contentSpacing, body } })
          }
        />
        <SliderField
          label="List Item"
          value={theme.contentSpacing.listItem}
          min={0}
          max={12}
          onChange={(listItem) =>
            onChange({ contentSpacing: { ...theme.contentSpacing, listItem } })
          }
        />
      </ControlBlock>
    </div>
  )
}
