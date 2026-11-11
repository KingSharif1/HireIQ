import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { generateAiText } from '@/lib/ai/complete'
import { tierForFeature } from '@/lib/ai/models'
import { buildReferralDraftPrompt } from '@/lib/referrals/draft-prompt'

/**
 * Draft a referral ask / warm intro. Returns the DRAFT text only — HireIQ never
 * sends it; the user reviews and sends on LinkedIn.
 */
const schema = z.object({
  connectionName: z.string(),
  connectionCompany: z.string(),
  connectionPosition: z.string(),
  targetCompany: z.string().min(1),
  targetRole: z.string(),
  candidateSummary: z.string(),
  kind: z.enum(['warm_intro', 'direct_referral']),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  try {
    const runtime = await resolveAiRuntime(user.id)
    const prompt = buildReferralDraftPrompt(parsed.data)
    const { text } = await generateAiText({
      runtime,
      feature: 'referral_draft',
      tier: tierForFeature('referral_draft'),
      prompt,
      maxOutputTokens: 500,
      usageMetadata: { kind: parsed.data.kind },
    })
    return NextResponse.json({ draft: text })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Draft failed' },
      { status: 500 },
    )
  }
}
