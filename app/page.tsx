import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/marketing/LandingPage'

export const metadata: Metadata = {
  title: 'HireIQ — Resume tailor & application tracker',
  description:
    'HireIQ helps job seekers tailor resumes to each role, track applications, and optionally sync employer email updates — so you spend less time on paperwork and more time interviewing.',
}

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return <LandingPage />
}
