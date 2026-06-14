import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import { runTailorPipeline } from '@/lib/ai/tailor-pipeline'
import type { GenerateFn } from '@/lib/ai/tailor-types'
import {
  mergePendingSuggestions,
  normalizeProfileData,
  writeBackToPending,
} from '@/lib/profile/provenance'
import {
  buildSuggestionNotification,
  buildTailorCompleteNotification,
} from '@/lib/notifications'
import { insertNotifications } from '@/lib/supabase/queries'
import type { Profile, ProfileData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const generateFn: GenerateFn = async ({ model, prompt, maxOutputTokens }) => {
  const result = await generateText({
    model: anthropic(model),
    prompt,
    maxOutputTokens,
  })
  return result.text
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resumeId, jobId, answers, questions } = await request.json() as {
    resumeId?: string
    jobId: string
    answers: Record<string, string>
    questions?: { id: string; question: string }[]
  }

  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  // Resolve questionId → real question text so the model and the saved record
  // both see the actual question asked (not a meaningless "q1" id).
  const questionLabels: Record<string, string> = {}
  for (const q of questions ?? []) {
    if (q?.id && q?.question) questionLabels[q.id] = q.question
  }
  const labelFor = (id: string) => questionLabels[id] ?? id

  const master = await getMasterResumeContext(supabase, user.id, resumeId)
  if ('error' in master) {
    return NextResponse.json({ error: master.error }, { status: master.status })
  }

  const { data: jobRow } = await supabase
    .from('jobs')
    .select('extracted_data, description')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (!jobRow?.extracted_data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const resume = master.structured
  const job = jobRow.extracted_data
  const baseResumeId = master.baseResumeId
  const gapAnswers = answers ?? {}

  if (gapAnswers && Object.keys(gapAnswers).length > 0) {
    const enhancementRows = Object.entries(gapAnswers)
      .filter(([, answer]) => answer.trim())
      .map(([questionId, answer]) => ({
        user_id: user.id,
        category: 'experience',
        question: labelFor(questionId),
        answer: answer.trim(),
        applied_to_resume: true,
      }))

    if (enhancementRows.length > 0) {
      await supabase.from('resume_enhancements').insert(enhancementRows)
    }
  }

  let pipelineResult
  try {
    pipelineResult = await runTailorPipeline({
      resume,
      job,
      answers: gapAnswers,
      questionLabels,
      generate: generateFn,
    })
  } catch (err) {
    return aiErrorResponse(err, 'Failed to tailor resume')
  }

  const { tailoredResume, changes, writeBackSuggestions, meta } = pipelineResult

  const matchScore = calculateATSScore(resume, job).total
  const tailoredScore = calculateATSScore(tailoredResume, job).total

  const { count: priorVersions } = await supabase
    .from('tailored_resumes')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('user_id', user.id)

  const gapAnswersRecord = Object.entries(gapAnswers)
    .filter(([, answer]) => answer.trim())
    .map(([questionId, answer]) => ({ questionId, question: labelFor(questionId), answer: answer.trim() }))

  const { data: tailoredRow, error: dbErr } = await supabase
    .from('tailored_resumes')
    .insert({
      user_id: user.id,
      base_resume_id: baseResumeId,
      job_id: jobId,
      structured_data: tailoredResume,
      changes,
      match_score: matchScore,
      tailored_score: tailoredScore,
      version: (priorVersions ?? 0) + 1,
      gap_answers: gapAnswersRecord,
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: 'Failed to save tailored resume' }, { status: 500 })

  await supabase
    .from('jobs')
    .update({ tailoring_status: 'tailored', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', user.id)

  const jobLabel = `${job.title || 'Role'} @ ${job.company || 'Company'}`
  const pendingFromRun = writeBackToPending(
    writeBackSuggestions,
    tailoredRow.id,
    jobLabel,
    resume.experience[0]?.id
  )

  const notificationRows = [
    buildTailorCompleteNotification(user.id, jobLabel, tailoredRow.id),
  ]
  if (pendingFromRun.length > 0) {
    notificationRows.push(
      buildSuggestionNotification(
        user.id,
        jobLabel,
        tailoredRow.id,
        pendingFromRun.length,
        pendingFromRun[0]?.section ?? 'experience'
      )
    )
  }
  await insertNotifications(supabase, notificationRows)

  if (pendingFromRun.length > 0) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('profile_data')
      .eq('id', user.id)
      .single<Pick<Profile, 'profile_data'>>()

    const profileData = normalizeProfileData(profileRow?.profile_data ?? {} as ProfileData)
    const merged = mergePendingSuggestions(profileData.pendingSuggestions ?? [], pendingFromRun)

    await supabase
      .from('profiles')
      .update({
        profile_data: { ...profileData, pendingSuggestions: merged },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  }

  return NextResponse.json({
    tailoredResumeId: tailoredRow.id,
    tailoredData: tailoredResume,
    changes,
    matchScore,
    tailoredScore,
    source: master.source,
    baseResumeId,
    tailoringNotes: tailoredResume.tailoring_notes ?? [],
    writeBackSuggestions,
    meta: {
      passedGate: meta.passedGate,
      warning: meta.warning,
      finalOverlapPercent: meta.finalOverlapPercent,
      attempts: meta.attempts,
      aiCallsUsed: meta.aiCallsUsed,
    },
  })
}
