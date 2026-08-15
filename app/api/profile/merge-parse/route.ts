import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveProfileData } from '@/lib/profile/data'
import { applyParseAdditions, parseAdditions } from '@/lib/profile/parse-additions'
import type { Profile, StructuredResume } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { resumeId?: string }
  if (!body.resumeId) return NextResponse.json({ error: 'resumeId required' }, { status: 400 })

  const [{ data: resume }, { data: profileRow }] = await Promise.all([
    supabase
      .from('resumes')
      .select('id, structured_data')
      .eq('id', body.resumeId)
      .eq('user_id', user.id)
      .single<{ id: string; structured_data: StructuredResume }>(),
    supabase
      .from('profiles')
      .select('profile_data, first_name, last_name, email')
      .eq('id', user.id)
      .single<Pick<Profile, 'profile_data' | 'first_name' | 'last_name' | 'email'>>(),
  ])

  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })

  const current = resolveProfileData(profileRow, null)
  const additions = parseAdditions(resume.structured_data, current)
  const updated = applyParseAdditions(current, additions)

  const { error } = await supabase
    .from('profiles')
    .update({ profile_data: updated, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })

  return NextResponse.json({
    applied: true,
    added: {
      experience: additions.experience.length,
      projects: additions.projects.length,
      skills: additions.skills.length,
    },
  })
}
