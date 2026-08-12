'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isIncluded, toggleInclusionId } from '@/lib/profile/inclusion'
import { getProvenanceLabel } from '@/lib/profile/provenance'
import { displaySkills } from '@/lib/profile/skills'
import type { ProfileData, ResumeInclusion } from '@/types'

interface ContentEditorProps {
  data: ProfileData
  inclusion: ResumeInclusion
  onInclusionChange: (next: ResumeInclusion) => void
  onUpdate: (patch: Partial<ProfileData>) => void
  /** When true, show provenance hints on tailor-origin bullets */
  showProvenance?: boolean
}

function SectionShell({
  title,
  open,
  onToggle,
  children,
  actions,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 text-left text-sm font-semibold text-foreground"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {title}
        </button>
        {actions}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex items-start gap-2 py-1.5 px-2 rounded-sm hover:bg-secondary/50 cursor-pointer group', className)}>
      <input
        type="checkbox"
        className="mt-1 rounded border-border"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div className="flex-1 min-w-0 text-sm leading-snug">{children}</div>
    </label>
  )
}

/** Teal-style Content Editor: accordion sections + include checkboxes. */
export function ContentEditor({
  data,
  inclusion,
  onInclusionChange,
  onUpdate,
  showProvenance = true,
}: ContentEditorProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    contact: true,
    title: true,
    summary: true,
    experience: true,
    education: false,
    skills: true,
    projects: true,
    certs: false,
  })

  const provenance = data.provenance ?? {}
  const allExpIds = (data.experience ?? []).map(e => e.id)
  const allBulletIds = (data.experience ?? []).flatMap((e, ei) =>
    (e.bullets ?? []).map((_, bi) => e.bulletIds?.[bi] ?? `${e.id}-${bi}`)
  ).concat(
    (data.projects ?? []).flatMap(p =>
      (p.bullets ?? []).map((_, bi) => p.bulletIds?.[bi] ?? `${p.id}-${bi}`)
    )
  )
  const allProjectIds = (data.projects ?? []).map(p => p.id)
  const allEduIds = (data.education ?? []).map(e => e.id)
  const skillItems = displaySkills(data.skills)
  const allSkills = skillItems.map(skill => skill.id)

  function toggle(section: string) {
    setOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="bg-white dark:bg-background border border-border rounded-md overflow-hidden">
      <SectionShell title="Contact Information" open={!!open.contact} onToggle={() => toggle('contact')}>
        <CheckRow
          checked={isIncluded(inclusion, 'section', 'contact')}
          onChange={v =>
            onInclusionChange(
              toggleInclusionId(inclusion, 'sectionIds', 'contact', ['contact', 'summary', 'title'], v)
            )
          }
        >
          <div className="space-y-0.5">
            <p className="font-medium">
              {[data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ') || 'Name'}
            </p>
            <p className="text-xs text-muted-foreground">
              {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' · ')}
            </p>
          </div>
        </CheckRow>
      </SectionShell>

      <SectionShell title="Target Title" open={!!open.title} onToggle={() => toggle('title')}>
        <CheckRow
          checked={isIncluded(inclusion, 'section', 'title')}
          onChange={v =>
            onInclusionChange(
              toggleInclusionId(inclusion, 'sectionIds', 'title', ['contact', 'summary', 'title'], v)
            )
          }
        >
          <input
            className="w-full bg-transparent border-0 p-0 text-sm font-medium focus:outline-none"
            value={data.personal.headline}
            onChange={e =>
              onUpdate({ personal: { ...data.personal, headline: e.target.value } })
            }
            placeholder="e.g. Full-Stack Software Developer"
            onClick={e => e.stopPropagation()}
          />
        </CheckRow>
      </SectionShell>

      <SectionShell title="Professional Summary" open={!!open.summary} onToggle={() => toggle('summary')}>
        <CheckRow
          checked={isIncluded(inclusion, 'section', 'summary')}
          onChange={v =>
            onInclusionChange(
              toggleInclusionId(inclusion, 'sectionIds', 'summary', ['contact', 'summary', 'title'], v)
            )
          }
        >
          <textarea
            className="w-full bg-transparent border-0 p-0 text-sm text-muted-foreground focus:outline-none resize-none min-h-[72px]"
            value={data.summary}
            onChange={e => onUpdate({ summary: e.target.value })}
            placeholder="Write a professional summary…"
            onClick={e => e.stopPropagation()}
          />
        </CheckRow>
      </SectionShell>

      <SectionShell
        title="Work Experience"
        open={!!open.experience}
        onToggle={() => toggle('experience')}
      >
        <div className="space-y-3">
          {(data.experience ?? []).map(exp => {
            const expOn = isIncluded(inclusion, 'experience', exp.id)
            return (
              <div key={exp.id} className="border border-border/80 rounded-md">
                <CheckRow
                  checked={expOn}
                  onChange={v =>
                    onInclusionChange(
                      toggleInclusionId(inclusion, 'experienceIds', exp.id, allExpIds, v)
                    )
                  }
                  className="font-medium"
                >
                  <span>{exp.company || 'Company'}</span>
                </CheckRow>
                <div className="pl-6 pr-2 pb-2 space-y-1">
                  <CheckRow
                    checked={expOn}
                    onChange={v =>
                      onInclusionChange(
                        toggleInclusionId(inclusion, 'experienceIds', exp.id, allExpIds, v)
                      )
                    }
                  >
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                      <span className="font-medium">{exp.title || 'Title'}</span>
                      <span className="text-muted-foreground">{exp.location}</span>
                      <span className="text-muted-foreground text-xs">
                        {exp.startDate}
                        {exp.endDate || exp.current ? ` – ${exp.current ? 'Present' : exp.endDate}` : ''}
                      </span>
                    </div>
                  </CheckRow>
                  {(exp.bullets ?? []).map((bullet, bi) => {
                    const id = exp.bulletIds?.[bi] ?? `${exp.id}-${bi}`
                    const label = showProvenance ? getProvenanceLabel(provenance[id]) : null
                    return (
                      <CheckRow
                        key={id}
                        checked={isIncluded(inclusion, 'bullet', id)}
                        onChange={v =>
                          onInclusionChange(
                            toggleInclusionId(inclusion, 'bulletIds', id, allBulletIds, v)
                          )
                        }
                      >
                        <span className="text-muted-foreground">{bullet || 'Bullet'}</span>
                        {label && (
                          <span className="block text-[10px] text-brand-purple mt-0.5">{label}</span>
                        )}
                      </CheckRow>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {(data.experience ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground px-2">No experience yet — add from the form editors or upload a resume.</p>
          )}
        </div>
      </SectionShell>

      <SectionShell title="Education" open={!!open.education} onToggle={() => toggle('education')}>
        <div className="space-y-1">
          {(data.education ?? []).map(edu => (
            <CheckRow
              key={edu.id}
              checked={isIncluded(inclusion, 'education', edu.id)}
              onChange={v =>
                onInclusionChange(
                  toggleInclusionId(inclusion, 'educationIds', edu.id, allEduIds, v)
                )
              }
            >
              <p className="font-medium">{edu.institution}</p>
              <p className="text-xs text-muted-foreground">
                {[edu.degree, edu.field].filter(Boolean).join(' · ')}
              </p>
            </CheckRow>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Skills" open={!!open.skills} onToggle={() => toggle('skills')}>
        <div className="flex flex-wrap gap-2 py-1">
          {skillItems.map(skill => (
            <label
              key={skill.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-pointer',
                isIncluded(inclusion, 'skill', skill.id)
                  ? 'border-border bg-secondary/40'
                  : 'border-border/50 opacity-40'
              )}
            >
              <input
                type="checkbox"
                className="rounded border-border"
                checked={isIncluded(inclusion, 'skill', skill.id)}
                onChange={e =>
                  onInclusionChange(
                    toggleInclusionId(inclusion, 'skillIds', skill.id, allSkills, e.target.checked)
                  )
                }
              />
              {skill.label}
            </label>
          ))}
          {allSkills.length === 0 && (
            <p className="text-xs text-muted-foreground">No skills yet.</p>
          )}
        </div>
      </SectionShell>

      <SectionShell title="Projects" open={!!open.projects} onToggle={() => toggle('projects')}>
        <div className="space-y-2">
          {(data.projects ?? []).map(p => (
            <div key={p.id} className="border border-border/80 rounded-md">
              <CheckRow
                checked={isIncluded(inclusion, 'project', p.id)}
                onChange={v =>
                  onInclusionChange(
                    toggleInclusionId(inclusion, 'projectIds', p.id, allProjectIds, v)
                  )
                }
              >
                <span className="font-medium">{p.name}</span>
              </CheckRow>
              <div className="pl-6 pr-2 pb-2 space-y-1">
                {(p.bullets ?? []).map((bullet, bi) => {
                  const id = p.bulletIds?.[bi] ?? `${p.id}-${bi}`
                  return (
                    <CheckRow
                      key={id}
                      checked={isIncluded(inclusion, 'bullet', id)}
                      onChange={v =>
                        onInclusionChange(
                          toggleInclusionId(inclusion, 'bulletIds', id, allBulletIds, v)
                        )
                      }
                    >
                      <span className="text-muted-foreground text-sm">{bullet}</span>
                    </CheckRow>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Certifications" open={!!open.certs} onToggle={() => toggle('certs')}>
        <div className="space-y-1">
          {(data.certifications ?? []).map((c, i) => (
            <CheckRow
              key={`${c.name}-${i}`}
              checked={isIncluded(inclusion, 'section', `cert-${i}`)}
              onChange={v =>
                onInclusionChange(
                  toggleInclusionId(
                    inclusion,
                    'sectionIds',
                    `cert-${i}`,
                    (data.certifications ?? []).map((_, j) => `cert-${j}`),
                    v
                  )
                )
              }
            >
              <span className="font-medium">{c.name}</span>
              {c.issuer && (
                <span className="block text-xs text-muted-foreground">{c.issuer}</span>
              )}
            </CheckRow>
          ))}
          {(data.certifications ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground px-2">No certifications.</p>
          )}
        </div>
      </SectionShell>
    </div>
  )
}
