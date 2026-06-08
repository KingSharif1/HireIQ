import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateDocx } from '@/lib/export/docx-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

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
