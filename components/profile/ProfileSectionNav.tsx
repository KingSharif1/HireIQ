'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
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

function SectionButton({
  section,
  data,
  resumeCount,
  isActive,
  onSelect,
  dense,
}: {
  section: (typeof SECTIONS)[number]
  data: ProfileData
  resumeCount: number
  isActive: boolean
  onSelect: (id: SectionId) => void
  dense?: boolean
}) {
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

  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      className={cn(
        'w-full flex items-center gap-2 rounded-md text-sm transition-colors text-left',
        dense ? 'px-2 py-1' : 'px-2 py-1.5',
        isActive
          ? 'bg-secondary text-foreground font-medium'
          : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1 truncate text-[13px]">{section.label}</span>
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
}

function NavGroups({
  data,
  resumeCount,
  active,
  onSelect,
  groups,
  dense,
}: {
  data: ProfileData
  resumeCount: number
  active: SectionId
  onSelect: (id: SectionId) => void
  groups: SectionGroup[]
  dense?: boolean
}) {
  return (
    <nav className={cn(dense ? 'space-y-2' : 'space-y-4')}>
      {groups.map(group => (
        <div key={group}>
          <p
            className={cn(
              'px-2 font-semibold tracking-wider text-muted-foreground uppercase',
              dense ? 'text-[9px] mb-0.5' : 'text-[10px] mb-1'
            )}
          >
            {group}
          </p>
          <div className="space-y-0.5">
            {SECTIONS.filter(s => s.group === group).map(section => (
              <SectionButton
                key={section.id}
                section={section}
                data={data}
                resumeCount={resumeCount}
                isActive={active === section.id}
                onSelect={onSelect}
                dense={dense}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const fullName =
    [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ') || 'Your Profile'
  const completeness = profileCompleteness(data, resumeCount)
  const activeDef = SECTIONS.find(s => s.id === active)

  function selectMobile(id: SectionId) {
    onSelect(id)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile: compact collapsible section drawer */}
      <div className="lg:hidden border-b border-border bg-background">
        <button
          type="button"
          onClick={() => setMobileOpen(o => !o)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
          aria-expanded={mobileOpen}
          aria-controls="profile-section-drawer"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Section · {completeness}%
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {activeDef?.label ?? 'Personal Info'}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              mobileOpen && 'rotate-180'
            )}
          />
        </button>
        <div className="mx-3 mb-2 h-0.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full',
              completeness === 100 ? 'bg-brand-green' : 'bg-foreground/70'
            )}
            style={{ width: `${completeness}%` }}
          />
        </div>
        {mobileOpen ? (
          <div
            id="profile-section-drawer"
            className="max-h-[55vh] overflow-y-auto border-t border-border px-2 py-2"
          >
            <NavGroups
              data={data}
              resumeCount={resumeCount}
              active={active}
              onSelect={selectMobile}
              groups={groups}
              dense
            />
          </div>
        ) : null}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-52 flex-shrink-0 border-r border-border">
        <div className={cn(stickyClassName, 'space-y-3 p-3')}>
          {showIdentity ? (
            <div className="px-2 py-1">
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
                <p className="mt-1.5 text-[10px] text-muted-foreground leading-snug">{hint}</p>
              ) : null}
            </div>
          ) : hint ? (
            <p className="px-2 text-[10px] text-muted-foreground leading-snug">{hint}</p>
          ) : null}

          <NavGroups
            data={data}
            resumeCount={resumeCount}
            active={active}
            onSelect={onSelect}
            groups={groups}
          />
        </div>
      </aside>
    </>
  )
}
