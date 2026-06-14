import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteResume, getResume } from '@/lib/supabase/queries'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: resume, error: fetchErr } = await getResume(supabase, id)
  if (fetchErr || !resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }
  if (resume.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await deleteResume(supabase, id)
  if (error) {
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
