import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MaskedReplyError, sendMaskedApplicationReply } from '@/lib/email/send-masked-reply'

export const runtime = 'nodejs'

const bodySchema = z.object({
  body: z.string().trim().min(1).max(50_000),
  to: z.string().trim().email().optional(),
  subject: z.string().trim().min(1).max(500).optional(),
  inReplyToId: z.string().min(1).max(200).optional(),
})

/**
 * Reply to an employer as the user's HireIQ application email (Task 140).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: applicationId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const result = await sendMaskedApplicationReply({
      userId: user.id,
      applicationId,
      body: parsed.data.body,
      to: parsed.data.to,
      subject: parsed.data.subject,
      inReplyToId: parsed.data.inReplyToId,
    })
    return NextResponse.json({
      entry: result.entry,
      resendId: result.resendId,
    })
  } catch (err) {
    if (err instanceof MaskedReplyError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[masked-reply] unexpected', err)
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
  }
}
