'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { normalizeProfileData } from '@/lib/profile/provenance'
import type { Profile, ProfileData } from '@/types'
import type { ResumeTheme } from '@/lib/export/theme'

interface UseProfileSaveOptions {
  userId: string
  initialData: ProfileData
  profile: Profile | null
  /** When set, save writes this theme; when omitted, resume_theme is left untouched. */
  theme?: ResumeTheme
}

export function useProfileSave({
  userId,
  initialData,
  profile,
  theme,
}: UseProfileSaveOptions) {
  const router = useRouter()
  const [data, setData] = useState<ProfileData>(() => normalizeProfileData(initialData))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(normalizeProfileData(initialData))
  }, [initialData])

  const update = useCallback((patch: Partial<ProfileData>) => {
    setData(prev => ({ ...prev, ...patch }))
    setDirty(true)
    setSaved(false)
  }, [])

  const markDirty = useCallback(() => {
    setDirty(true)
    setSaved(false)
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const payload: Record<string, unknown> = {
      profile_data: data,
      first_name: data.personal.firstName.trim() || profile?.first_name || null,
      last_name: data.personal.lastName.trim() || profile?.last_name || null,
      updated_at: new Date().toISOString(),
    }
    if (theme !== undefined) {
      payload.resume_theme = theme
    }

    const { error: err } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    if (err) {
      setError(err.message)
    } else {
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleSuggestionResolved(
    suggestionId: string,
    action: 'accept' | 'decline',
    enrichment?: import('@/lib/profile/suggestion-followup').SuggestionEnrichment
  ) {
    const res = await fetch('/api/profile/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, suggestionId, enrichment }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed')
    setData(normalizeProfileData(json.profileData))
    setDirty(false)
    router.refresh()
  }

  return {
    data,
    setData,
    update,
    markDirty,
    dirty,
    setDirty,
    saving,
    saved,
    error,
    setError,
    setSaved,
    handleSave,
    handleSuggestionResolved,
    router,
  }
}
