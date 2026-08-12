'use client'

import type { ResumeTheme } from '@/lib/export/theme'
import { ChoiceCards, ControlBlock } from './controls'

interface Props {
  theme: ResumeTheme
  onChange: (patch: Partial<ResumeTheme>) => void
}

export function SettingsTab({ theme, onChange }: Props) {
  const exp = theme.experienceSettings
  const edu = theme.educationSettings

  return (
    <div className="space-y-3">
      <ControlBlock title="Work Experience Settings">
        <ChoiceCards
          label="Show Locations By"
          value={exp.showLocationBy}
          onChange={(showLocationBy) =>
            onChange({ experienceSettings: { ...exp, showLocationBy } })
          }
          options={[
            { value: 'company-line', label: 'Company' },
            { value: 'title-line', label: 'Position' },
            { value: 'hidden', label: 'None' },
          ]}
        />
        <ChoiceCards
          label="Show Work Experience By"
          value={exp.showBy}
          onChange={(showBy) => onChange({ experienceSettings: { ...exp, showBy } })}
          options={[
            { value: 'company-first', label: 'Company' },
            { value: 'title-first', label: 'Position' },
          ]}
        />
        <ChoiceCards
          label="Show Dates By"
          value={exp.showDatesBy}
          onChange={(showDatesBy) =>
            onChange({ experienceSettings: { ...exp, showDatesBy } })
          }
          options={[
            { value: 'right', label: 'Right' },
            { value: 'inline', label: 'Inline' },
          ]}
        />
      </ControlBlock>

      <ControlBlock title="Education Settings">
        <ChoiceCards
          label="Show Education By"
          value={edu.showBy}
          onChange={(showBy) => onChange({ educationSettings: { ...edu, showBy } })}
          options={[
            { value: 'institution-first', label: 'Institution' },
            { value: 'degree-first', label: 'Degree' },
          ]}
        />
        <ChoiceCards
          label="Layout"
          value={edu.layout}
          onChange={(layout) => onChange({ educationSettings: { ...edu, layout } })}
          options={[
            { value: 'stacked', label: 'Stacked' },
            { value: 'inline', label: 'Inline' },
          ]}
        />
      </ControlBlock>
    </div>
  )
}
