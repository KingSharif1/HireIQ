import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  acceptSuggestion,
  declineSuggestion,
  normalizeProfileData,
} from '@/lib/profile/provenance'
import { pendingClearedForTailorRun } from '@/lib/notifications'
import { markNotificationsRead } from '@/lib/supabase/queries'
import { validateEnrichment, type SuggestionEnrichment } from '@/lib/profile/suggestion-followup'
import { suggestionNeedsFollowUp } from '@/lib/profile/suggestion-followup'
import type { Profile, ProfileData } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    action: 'accept' | 'decline'
    suggestionId: string
    enrichment?: SuggestionEnrichment
  }
  const { action, suggestionId, enrichment } = body

  if (!suggestionId || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'action and suggestionId required' }, { status: 400 })
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('profile_data')
    .eq('id', user.id)
    .single<Pick<Profile, 'profile_data'>>()

  const current = normalizeProfileData(profileRow?.profile_data ?? ({} as ProfileData))
  const suggestion = (current.pendingSuggestions ?? []).find(s => s.id === suggestionId)
  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
  }

  if (action === 'accept' && suggestionNeedsFollowUp(suggestion) && !enrichment) {
    return NextResponse.json(
      { error: 'This update needs a follow-up form before it can be accepted' },
      { status: 400 }
    )
  }

  if (enrichment) {
    const err = validateEnrichment(enrichment)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  const sourceTailorId = suggestion.sourceTailoredResumeId

  const updated =
    action === 'accept'
      ? acceptSuggestion(current, suggestionId, enrichment)
      : declineSuggestion(current, suggestionId)

  const { error } = await supabase
    .from('profiles')
    .update({ profile_data: updated, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })

  if (
    sourceTailorId &&
    pendingClearedForTailorRun(updated.pendingSuggestions ?? [], sourceTailorId)
  ) {
    await markNotificationsRead(supabase, user.id, { refId: sourceTailorId })
  }

  return NextResponse.json({
    profileData: updated,
    pendingCount: (updated.pendingSuggestions ?? []).length,
  })
}
