import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resumeId, jobId } = await request.json()
  if (!resumeId || !jobId) return NextResponse.json({ error: 'resumeId and jobId required' }, { status: 400 })

  const [resumeRes, jobRes] = await Promise.all([
    supabase.from('resumes').select('structured_data').eq('id', resumeId).eq('user_id', user.id).single(),
    supabase.from('jobs').select('extracted_data').eq('id', jobId).eq('user_id', user.id).single(),
  ])

  if (resumeRes.error || !resumeRes.data) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  if (jobRes.error || !jobRes.data?.extracted_data) return NextResponse.json({ error: 'Job not found or not analyzed' }, { status: 404 })

  const score = calculateATSScore(resumeRes.data.structured_data, jobRes.data.extracted_data)
  return NextResponse.json({ score })
}
