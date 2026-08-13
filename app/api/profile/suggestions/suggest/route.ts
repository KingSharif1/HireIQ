import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildWriteBackSuggestions } from '@/lib/ai/tailor-engine'
import {
  mergePendingSuggestions,
  normalizeProfileData,
  writeBackToPending,
} from '@/lib/profile/provenance'
import { buildSuggestionNotification } from '@/lib/notifications'
import { insertNotifications } from '@/lib/supabase/queries'
import type { Profile, ProfileData, TailorGapAnswer } from '@/types'

/**
 * Explicit Suggest for master — queues pending proposals from a tailored resume's Q&A.
 * Does not silently overwrite profile_data content.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { tailoredResumeId?: string }
  const tailoredResumeId = body.tailoredResumeId
  if (!tailoredResumeId) {
    return NextResponse.json({ error: 'tailoredResumeId required' }, { status: 400 })
  }

  const { data: tailored } = await supabase
    .from('tailored_resumes')
    .select('id, job_id, gap_answers, jobs(title, company)')
    .eq('id', tailoredResumeId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tailored) {
    return NextResponse.json({ error: 'Tailored resume not found' }, { status: 404 })
  }

  const gapAnswers = (Array.isArray(tailored.gap_answers) ? tailored.gap_answers : []) as TailorGapAnswer[]
  const answers: Record<string, string> = {}
  for (const row of gapAnswers) {
    if (row.questionId && row.answer?.trim()) {
      answers[row.questionId] = row.answer.trim()
    }
  }

  const jobJoin = tailored.jobs as
    | { title: string | null; company: string | null }
    | { title: string | null; company: string | null }[]
    | null
  const job = Array.isArray(jobJoin) ? jobJoin[0] ?? null : jobJoin
  const jobLabel = `${job?.title || 'Role'} @ ${job?.company || 'Company'}`

  const writeBack = buildWriteBackSuggestions(answers, job?.title || 'this role')
  if (writeBack.length === 0) {
    return NextResponse.json({
      queued: 0,
      message: 'No answers long enough to suggest for master',
    })
  }

  // No targetEntryId — Accept opens follow-up sheet for a new experience/project
  const pending = writeBackToPending(writeBack, tailored.id, jobLabel, undefined)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('profile_data')
    .eq('id', user.id)
    .single<Pick<Profile, 'profile_data'>>()

  const profileData = normalizeProfileData(profileRow?.profile_data ?? ({} as ProfileData))
  const existingIds = new Set((profileData.pendingSuggestions ?? []).map(s => s.id))
  const fresh = pending.filter(s => !existingIds.has(s.id))
  const merged = mergePendingSuggestions(profileData.pendingSuggestions ?? [], fresh)

  const { error } = await supabase
    .from('profiles')
    .update({
      profile_data: { ...profileData, pendingSuggestions: merged },
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to queue suggestions' }, { status: 500 })

  if (fresh.length > 0) {
    await insertNotifications(supabase, [
      buildSuggestionNotification(
        user.id,
        jobLabel,
        tailored.id,
        fresh.length,
        fresh[0]?.section ?? 'experience'
      ),
    ])
  }

  return NextResponse.json({
    queued: fresh.length,
    pendingCount: merged.length,
    profilePath: '/dashboard/builder?view=master&section=experience',
  })
}
