import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/marketing/LandingPage'

export const metadata: Metadata = {
  title: 'HireIQ — Tailor, auto-apply, and track every job',
  description:
    'Paste a job URL, tailor your resume from your master profile and GitHub, auto-apply on supported forms, and track every employer reply.',
}

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return <LandingPage />
}
