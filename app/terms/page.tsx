import Link from 'next/link'
import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Terms of Service — HireIQ',
  description: 'Terms for using HireIQ.',
}

const UPDATED = 'August 12, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image src="/logo.svg" alt="HireIQ" width={32} height={32} className="rounded-lg" />
            HireIQ
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6 text-sm leading-relaxed">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: {UPDATED}</p>
        </div>

        <p className="text-muted-foreground">
          These terms govern your use of HireIQ at{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="https://hireiq.kingsharif.com">
            hireiq.kingsharif.com
          </a>
          . By creating an account or using the service, you agree to them.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. The service</h2>
          <p className="text-muted-foreground">
            HireIQ provides tools to upload and tailor resumes, track job applications, and optionally
            sync related email activity. Features may change as we improve the product.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Your account</h2>
          <p className="text-muted-foreground">
            You are responsible for your account credentials and for content you upload (resumes, notes,
            job materials). Provide accurate information and keep access secure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Acceptable use</h2>
          <p className="text-muted-foreground">
            Use HireIQ for lawful job-search purposes. Do not abuse the service, attempt unauthorized
            access, or upload content you do not have rights to process.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Connected services</h2>
          <p className="text-muted-foreground">
            Optional connections (Google, Gmail read-only, GitHub, masked email) are controlled by you
            in Settings and by those providers’ terms. Disconnect anytime.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Disclaimers</h2>
          <p className="text-muted-foreground">
            HireIQ is provided “as is.” We do not guarantee interviews, offers, or perfect ATS outcomes.
            AI suggestions can be wrong — review before you submit applications.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Privacy</h2>
          <p className="text-muted-foreground">
            See our{' '}
            <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
              Privacy Policy
            </Link>{' '}
            for how we handle data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Contact</h2>
          <p className="text-muted-foreground">
            Questions:{' '}
            <a className="text-primary underline-offset-2 hover:underline" href="mailto:privacy@kingsharif.com">
              privacy@kingsharif.com
            </a>
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HireIQ ·{' '}
        <Link href="/privacy" className="hover:underline underline-offset-2">
          Privacy
        </Link>
        {' · '}
        <Link href="/terms" className="hover:underline underline-offset-2">
          Terms
        </Link>
      </footer>
    </div>
  )
}
