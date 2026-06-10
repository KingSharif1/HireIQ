import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDocx } from '@/lib/export/docx-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tailoredResumeId } = await request.json()

  const { data: tailored } = await supabase
    .from('tailored_resumes')
    .select('structured_data')
    .eq('id', tailoredResumeId)
    .eq('user_id', user.id)
    .single()

  if (!tailored) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await generateDocx(tailored.structured_data)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="resume.docx"',
    },
  })
}
