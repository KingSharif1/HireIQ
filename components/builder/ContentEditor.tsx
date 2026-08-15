'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isIncluded, toggleInclusionId } from '@/lib/profile/inclusion'
import { getProvenanceLabel } from '@/lib/profile/provenance'
import { canonicalSkillId, displaySkills } from '@/lib/profile/skills'
import { EditableText } from '@/components/builder/EditableText'
import type { ProfileData, ResumeInclusion, ResumeSkills } from '@/types'

interface ContentEditorProps {
  data: ProfileData
  inclusion: ResumeInclusion
  onInclusionChange: (next: ResumeInclusion) => void
  onUpdate: (patch: Partial<ProfileData>) => void
  /** When true, show provenance hints on tailor-origin bullets */
  showProvenance?: boolean
  /** Row ids to highlight (bullet id, exp id, `summary`, `skills`, project id). */
  highlightIds?: string[]
  /** Ids marked as brand-new tailor additions (show New badge). */
  newAdditionIds?: string[]
}

function SectionShell({
  title,
  open,
  onToggle,
  children,
  actions,
  highlighted,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  actions?: React.ReactNode
  highlighted?: boolean
}) {
  return (
    <div className={cn('border-b border-border', highlighted && 'bg-teal-600/5')}>
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
  highlighted,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
  className?: string
  highlighted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 py-1.5 px-2 rounded-sm hover:bg-secondary/50 group',
        highlighted && 'bg-teal-600/10 ring-1 ring-teal-600/30',
        className
      )}
    >
      <input
        type="checkbox"
        className="mt-1 rounded border-border"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-label="Include on this resume"
      />
      <div className="flex-1 min-w-0 text-sm leading-snug">{children}</div>
    </div>
  )
}

function NewBadge() {
  return (
    <span className="ml-1 inline-flex items-center rounded-md bg-teal-600/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
      New
    </span>
  )
}

function renameSkill(skills: ResumeSkills, oldLabel: string, nextLabel: string): ResumeSkills {
  const id = canonicalSkillId(oldLabel)
  const trimmed = nextLabel.trim()
  const replace = (arr: string[]) =>
    arr.map(s => (canonicalSkillId(s) === id ? trimmed || s : s)).filter(Boolean)
  return {
    ...skills,
    technical: replace(skills.technical ?? []),
    tools: replace(skills.tools ?? []),
    languages: replace(skills.languages ?? []),
    soft: replace(skills.soft ?? []),
  }
}

/** Teal-style Content Editor: accordion + include checkboxes + pen to edit real text. */
export function ContentEditor({
  data,
  inclusion,
  onInclusionChange,
  onUpdate,
  showProvenance = true,
  highlightIds = [],
  newAdditionIds = [],
}: ContentEditorProps) {
  const marked = new Set(highlightIds)
  const isNew = new Set(newAdditionIds)
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
  const [newSkill, setNewSkill] = useState('')

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

  function addSkill() {
    const label = newSkill.trim()
    if (!label) return
    if (skillItems.some(s => s.id === canonicalSkillId(label))) {
      setNewSkill('')
      return
    }
    onUpdate({
      skills: {
        ...data.skills,
        technical: [...(data.skills.technical ?? []), label],
      },
    })
    setNewSkill('')
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
          <div className="space-y-2">
            <EditableText
              value={[data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ')}
              displayClassName="font-medium"
              label="Edit name"
              placeholder="Name"
              onSave={next => {
                const [first, ...rest] = next.split(' ').filter(Boolean)
                onUpdate({
                  personal: {
                    ...data.personal,
                    firstName: first ?? '',
                    lastName: rest.join(' '),
                  },
                })
              }}
            />
            <EditableText
              value={data.personal.email}
              displayClassName="text-xs text-muted-foreground"
              label="Edit email"
              placeholder="Email"
              onSave={next => onUpdate({ personal: { ...data.personal, email: next } })}
            />
            <EditableText
              value={data.personal.phone}
              displayClassName="text-xs text-muted-foreground"
              label="Edit phone"
              placeholder="Phone"
              onSave={next => onUpdate({ personal: { ...data.personal, phone: next } })}
            />
            <EditableText
              value={data.personal.location}
              displayClassName="text-xs text-muted-foreground"
              label="Edit location"
              placeholder="Location"
              onSave={next => onUpdate({ personal: { ...data.personal, location: next } })}
            />
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
          <EditableText
            value={data.personal.headline}
            displayClassName="font-medium"
            placeholder="e.g. Full-Stack Software Developer"
            label="Edit target title"
            onSave={next => onUpdate({ personal: { ...data.personal, headline: next } })}
          />
        </CheckRow>
      </SectionShell>

      <SectionShell
        title="Professional Summary"
        open={!!open.summary}
        onToggle={() => toggle('summary')}
        highlighted={marked.has('summary')}
        actions={isNew.has('summary') ? <NewBadge /> : null}
      >
        <CheckRow
          checked={isIncluded(inclusion, 'section', 'summary')}
          highlighted={marked.has('summary')}
          onChange={v =>
            onInclusionChange(
              toggleInclusionId(inclusion, 'sectionIds', 'summary', ['contact', 'summary', 'title'], v)
            )
          }
        >
          <EditableText
            multiline
            value={data.summary}
            displayClassName="text-muted-foreground"
            placeholder="Write a professional summary…"
            label="Edit summary"
            onSave={next => onUpdate({ summary: next })}
          />
        </CheckRow>
      </SectionShell>

      <SectionShell
        title="Work Experience"
        open={!!open.experience}
        onToggle={() => toggle('experience')}
        highlighted={(data.experience ?? []).some(e => marked.has(e.id))}
      >
        <div className="space-y-3">
          {(data.experience ?? []).map(exp => {
            const expOn = isIncluded(inclusion, 'experience', exp.id)
            return (
              <div
                key={exp.id}
                className={cn(
                  'border border-border/80 rounded-md',
                  marked.has(exp.id) && 'border-teal-600/50 bg-teal-600/5'
                )}
              >
                <CheckRow
                  checked={expOn}
                  highlighted={marked.has(exp.id)}
                  onChange={v =>
                    onInclusionChange(
                      toggleInclusionId(inclusion, 'experienceIds', exp.id, allExpIds, v)
                    )
                  }
                  className="font-medium"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isNew.has(exp.id) ? <NewBadge /> : null}
                    <EditableText
                      value={exp.company}
                      displayClassName="font-medium"
                      placeholder="Company"
                      label="Edit company"
                      onSave={next =>
                        onUpdate({
                          experience: data.experience.map(e =>
                            e.id === exp.id ? { ...e, company: next } : e
                          ),
                        })
                      }
                    />
                  </div>
                </CheckRow>
                <div className="pl-6 pr-2 pb-2 space-y-1">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm px-2 py-1">
                    <EditableText
                      value={exp.title}
                      displayClassName="font-medium"
                      placeholder="Title"
                      label="Edit title"
                      onSave={next =>
                        onUpdate({
                          experience: data.experience.map(e =>
                            e.id === exp.id ? { ...e, title: next } : e
                          ),
                        })
                      }
                    />
                    <EditableText
                      value={exp.location}
                      displayClassName="text-muted-foreground"
                      placeholder="Location"
                      label="Edit location"
                      onSave={next =>
                        onUpdate({
                          experience: data.experience.map(e =>
                            e.id === exp.id ? { ...e, location: next } : e
                          ),
                        })
                      }
                    />
                  </div>
                  {(exp.bullets ?? []).map((bullet, bi) => {
                    const id = exp.bulletIds?.[bi] ?? `${exp.id}-${bi}`
                    const label = showProvenance ? getProvenanceLabel(provenance[id]) : null
                    return (
                      <CheckRow
                        key={id}
                        checked={isIncluded(inclusion, 'bullet', id)}
                        highlighted={marked.has(id) || marked.has(exp.id)}
                        onChange={v =>
                          onInclusionChange(
                            toggleInclusionId(inclusion, 'bulletIds', id, allBulletIds, v)
                          )
                        }
                      >
                        <div className="space-y-1">
                          {isNew.has(id) || isNew.has(exp.id) ? <NewBadge /> : null}
                          <EditableText
                            multiline
                            value={bullet}
                            displayClassName="text-muted-foreground"
                            placeholder="Bullet"
                            label="Edit bullet"
                            onSave={next =>
                              onUpdate({
                                experience: data.experience.map(e =>
                                  e.id === exp.id
                                    ? {
                                        ...e,
                                        bullets: e.bullets.map((b, i) => (i === bi ? next : b)),
                                      }
                                    : e
                                ),
                              })
                            }
                          />
                          {label && (
                            <span className="block text-[10px] text-brand-purple mt-0.5">{label}</span>
                          )}
                        </div>
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
              <EditableText
                value={edu.institution}
                displayClassName="font-medium"
                placeholder="School"
                label="Edit school"
                onSave={next =>
                  onUpdate({
                    education: data.education.map(e =>
                      e.id === edu.id ? { ...e, institution: next } : e
                    ),
                  })
                }
              />
              <EditableText
                value={[edu.degree, edu.field].filter(Boolean).join(' · ')}
                displayClassName="text-xs text-muted-foreground"
                placeholder="Degree · field"
                label="Edit degree"
                onSave={next => {
                  const [degree, ...field] = next.split('·').map(s => s.trim())
                  onUpdate({
                    education: data.education.map(e =>
                      e.id === edu.id ? { ...e, degree: degree ?? '', field: field.join(' · ') } : e
                    ),
                  })
                }}
              />
            </CheckRow>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        title="Skills"
        open={!!open.skills}
        onToggle={() => toggle('skills')}
        highlighted={marked.has('skills')}
      >
        <div className="flex flex-wrap gap-2 py-1">
          {skillItems.map(skill => (
            <div
              key={skill.id}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs',
                isIncluded(inclusion, 'skill', skill.id)
                  ? 'border-border bg-secondary/40'
                  : 'border-border/50 opacity-40',
                marked.has('skills') && 'border-teal-600/40'
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
                aria-label={`Include ${skill.label}`}
              />
              <EditableText
                value={skill.label}
                displayClassName="text-xs"
                label={`Edit skill ${skill.label}`}
                onSave={next => onUpdate({ skills: renameSkill(data.skills, skill.label, next) })}
              />
            </div>
          ))}
          {allSkills.length === 0 && (
            <p className="text-xs text-muted-foreground">No skills yet.</p>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 h-8 rounded-md border border-border bg-input px-2 text-xs"
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSkill()
              }
            }}
            placeholder="Add a skill you actually have…"
            aria-label="Add skill"
          />
          <button
            type="button"
            className="h-8 rounded-md border border-border px-2 text-xs font-medium text-foreground"
            onClick={addSkill}
          >
            Add
          </button>
        </div>
      </SectionShell>

      <SectionShell
        title="Projects"
        open={!!open.projects}
        onToggle={() => toggle('projects')}
        highlighted={(data.projects ?? []).some(p => marked.has(p.id))}
      >
        <div className="space-y-2">
          {(data.projects ?? []).map(p => (
            <div
              key={p.id}
              className={cn(
                'border border-border/80 rounded-md',
                marked.has(p.id) && 'border-teal-600/50 bg-teal-600/5'
              )}
            >
              <CheckRow
                checked={isIncluded(inclusion, 'project', p.id)}
                highlighted={marked.has(p.id)}
                onChange={v =>
                  onInclusionChange(
                    toggleInclusionId(inclusion, 'projectIds', p.id, allProjectIds, v)
                  )
                }
              >
                <EditableText
                  value={p.name}
                  displayClassName="font-medium"
                  placeholder="Project"
                  label="Edit project name"
                  onSave={next =>
                    onUpdate({
                      projects: data.projects.map(proj =>
                        proj.id === p.id ? { ...proj, name: next } : proj
                      ),
                    })
                  }
                />
              </CheckRow>
              <div className="pl-6 pr-2 pb-2 space-y-1">
                {(p.bullets ?? []).map((bullet, bi) => {
                  const id = p.bulletIds?.[bi] ?? `${p.id}-${bi}`
                  return (
                    <CheckRow
                      key={id}
                      checked={isIncluded(inclusion, 'bullet', id)}
                      highlighted={marked.has(id) || marked.has(p.id)}
                      onChange={v =>
                        onInclusionChange(
                          toggleInclusionId(inclusion, 'bulletIds', id, allBulletIds, v)
                        )
                      }
                    >
                      <EditableText
                        multiline
                        value={bullet}
                        displayClassName="text-muted-foreground text-sm"
                        placeholder="Bullet"
                        label="Edit project bullet"
                        onSave={next =>
                          onUpdate({
                            projects: data.projects.map(proj =>
                              proj.id === p.id
                                ? {
                                    ...proj,
                                    bullets: proj.bullets.map((b, i) => (i === bi ? next : b)),
                                  }
                                : proj
                            ),
                          })
                        }
                      />
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
              <EditableText
                value={c.name}
                displayClassName="font-medium"
                placeholder="Certification"
                label="Edit certification"
                onSave={next =>
                  onUpdate({
                    certifications: data.certifications.map((cert, idx) =>
                      idx === i ? { ...cert, name: next } : cert
                    ),
                  })
                }
              />
              {c.issuer ? (
                <EditableText
                  value={c.issuer}
                  displayClassName="text-xs text-muted-foreground"
                  placeholder="Issuer"
                  label="Edit issuer"
                  onSave={next =>
                    onUpdate({
                      certifications: data.certifications.map((cert, idx) =>
                        idx === i ? { ...cert, issuer: next } : cert
                      ),
                    })
                  }
                />
              ) : null}
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
