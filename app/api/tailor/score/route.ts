import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resumeId, jobId } = await request.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const master = await getMasterResumeContext(supabase, user.id, resumeId)
  if ('error' in master) {
    return NextResponse.json({ error: master.error }, { status: master.status })
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('extracted_data')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (!job?.extracted_data) {
    return NextResponse.json({ error: 'Job not found or not analyzed' }, { status: 404 })
  }

  const score = calculateATSScore(master.structured, job.extracted_data)
  return NextResponse.json({
    score,
    source: master.source,
    baseResumeId: master.baseResumeId,
  })
}
