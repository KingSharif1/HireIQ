import type { SectionId } from '@/lib/profile/sections'

export function profilePath(section?: string | null, extra?: Record<string, string>): string {
  const q = new URLSearchParams()
  if (section) q.set('section', section)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) q.set(key, value)
    }
  }
  const qs = q.toString()
  return qs ? `/dashboard/profile?${qs}` : '/dashboard/profile'
}

export function profileSectionPath(section: SectionId | string): string {
  return profilePath(section)
}
