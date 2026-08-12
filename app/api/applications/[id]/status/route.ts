import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ApplicationStatusError, setApplicationStatus } from '@/lib/applications/status'

const STATUSES = [
  'bookmarked',
  'applying',
  'applied',
  'interviewing',
  'negotiating',
  'offer',
  'accepted',
  'rejected',
] as const

const bodySchema = z.object({
  status: z.enum(STATUSES),
  jobId: z.string().uuid().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const application = await setApplicationStatus(supabase, {
      userId: user.id,
      applicationId: id,
      jobId: parsed.data.jobId,
      status: parsed.data.status,
      meta: { via: 'api', ...(parsed.data.meta ?? {}) },
    })
    return NextResponse.json({ application })
  } catch (err) {
    if (err instanceof ApplicationStatusError) {
      const status = err.code === 'not_found' ? 404 : 500
      return NextResponse.json({ error: err.message }, { status })
    }
    throw err
  }
}
