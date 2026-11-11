import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { resolveBlueprint } from '@/lib/profile/blueprint'
import { mergeDraftedRules, type DraftedRule } from '@/lib/tailor/rule-from-diff'
import type { ProfileData } from '@/types'

/**
 * Persist a "save as rule" decision from the review UI into the user's resume
 * blueprint. Used by TailorDiff's onSaveRule.
 */
const ruleSchema = z.object({
  id: z.string().min(1),
  section: z.string().min(1),
  action: z.enum(['auto', 'tailored', 'verbatim', 'hidden']),
  label: z.string().optional(),
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

  const parsed = ruleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rule' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_data')
    .eq('id', user.id)
    .maybeSingle()

  const profileData = (profile?.profile_data ?? {}) as ProfileData
  const blueprint = resolveBlueprint(profileData)
  const draft: DraftedRule = {
    id: parsed.data.id,
    section: parsed.data.section,
    action: parsed.data.action,
    label: parsed.data.label ?? '',
  }
  const merged = mergeDraftedRules(blueprint, [draft])

  const { error } = await supabase
    .from('profiles')
    .update({
      profile_data: { ...profileData, blueprint: merged },
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ blueprint: merged })
}
