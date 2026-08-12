'use client'

import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  SECTIONS,
  sectionCount,
  sectionComplete,
  profileCompleteness,
  type SectionGroup,
  type SectionId,
} from '@/lib/profile/sections'
import { pendingCountForSection } from '@/lib/profile/provenance'
import type { ProfileData } from '@/types'

interface ProfileSectionNavProps {
  data: ProfileData
  resumeCount: number
  active: SectionId
  onSelect: (id: SectionId) => void
  groups: SectionGroup[]
  emailFallback?: string | null
  /** Extra hint under the completeness meter */
  hint?: string
  /** Sticky top offset for desktop (matches chrome height) */
  stickyClassName?: string
  /** When false, identity + completeness live elsewhere (e.g. ProfileHome header). */
  showIdentity?: boolean
}

export function ProfileSectionNav({
  data,
  resumeCount,
  active,
  onSelect,
  groups,
  emailFallback,
  hint,
  stickyClassName = 'lg:sticky lg:top-0',
  showIdentity = true,
}: ProfileSectionNavProps) {
  const fullName =
    [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ') || 'Your Profile'
  const completeness = profileCompleteness(data, resumeCount)

  return (
    <aside className="lg:w-52 flex-shrink-0 border-r border-border">
      <div className={cn(stickyClassName, 'space-y-4 p-3')}>
        {showIdentity ? (
          <div className="px-2 py-2">
            <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {data.personal.email || emailFallback || ''}
            </p>
            <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  completeness === 100 ? 'bg-brand-green' : 'bg-foreground/70'
                )}
                style={{ width: `${completeness}%` }}
              />
            </div>
            {hint ? (
              <p className="mt-2 text-[10px] text-muted-foreground leading-snug">{hint}</p>
            ) : null}
          </div>
        ) : hint ? (
          <p className="px-2 text-[10px] text-muted-foreground leading-snug">{hint}</p>
        ) : null}

        <nav className="space-y-4">
          {groups.map(group => (
            <div key={group}>
              <p className="px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">
                {group}
              </p>
              <div className="space-y-0.5">
                {SECTIONS.filter(s => s.group === group).map(section => {
                  const Icon = section.icon
                  const count = sectionCount(section.id, data, resumeCount)
                  const pending =
                    section.id === 'experience' ||
                    section.id === 'projects' ||
                    section.id === 'summary' ||
                    section.id === 'skills'
                      ? pendingCountForSection(data, section.id)
                      : 0
                  const complete = sectionComplete(section.id, data, resumeCount)
                  const isActive = active === section.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onSelect(section.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left',
                        isActive
                          ? 'bg-secondary text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{section.label}</span>
                      {pending > 0 ? (
                        <Badge className="px-1.5 py-0 text-[10px] min-w-[1.25rem] justify-center bg-brand-amber/20 text-brand-amber border-brand-amber/30">
                          {pending}
                        </Badge>
                      ) : count != null && count > 0 ? (
                        <Badge
                          variant={isActive ? 'default' : 'muted'}
                          className="px-1.5 py-0 text-[10px] min-w-[1.25rem] justify-center"
                        >
                          {count}
                        </Badge>
                      ) : complete ? (
                        <Check className="w-3.5 h-3.5 text-brand-green" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}
