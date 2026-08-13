import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg">
            <Image src="/logo.svg" alt="" width={36} height={36} className="rounded-lg" />
            <span>HireIQ</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground hidden sm:inline">
              Privacy
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-foreground text-background px-3 py-1.5 font-medium hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 md:pt-24 md:pb-16">
          <p className="text-sm font-medium text-muted-foreground mb-4 tracking-wide">HireIQ</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl leading-[1.15]">
            Tailor your resume. Track every application.
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
            HireIQ is a job-search workspace: upload your resume, match it to each job description,
            track where you applied, and optionally sync employer email updates so status changes
            show up in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary/60"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/20">
          <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 grid gap-8 md:grid-cols-3">
            {[
              {
                title: 'Resume tailor',
                body: 'Parse your resume, compare it to a job posting, and generate a tailored version with clear changes you control.',
              },
              {
                title: 'Application tracker',
                body: 'Save jobs from common ATS boards, log status, notes, and answers — then pick up where you left off.',
              },
              {
                title: 'Email status (optional)',
                body: 'Connect Gmail read-only or use a HireIQ application email so confirmations and updates can land next to each job.',
              },
            ].map(item => (
              <div key={item.title} className="space-y-2">
                <h2 className="text-base font-semibold">{item.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <h2 className="text-xl font-semibold">What HireIQ is for</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
            HireIQ helps people applying to jobs keep resumes accurate for each role and keep a
            reliable record of applications. It is not a job board and does not apply for you without
            your action. Optional Google and GitHub connections are used only for sign-in, read-only
            Gmail matching, and project suggestions — you can disconnect them anytime in Settings.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} HireIQ</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground underline-offset-2 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
