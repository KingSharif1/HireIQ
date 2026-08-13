import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectGoogleAccount } from '@/lib/google/connection'

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await disconnectGoogleAccount(supabase, user.id)
  return NextResponse.json({ ok: true })
}
