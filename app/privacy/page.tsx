import Link from 'next/link'
import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Privacy Policy — HireIQ',
  description: 'How HireIQ collects, uses, and protects your information.',
}

const UPDATED = 'August 12, 2026'

export default function PrivacyPage() {
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

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6 text-sm leading-relaxed text-foreground">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: {UPDATED}</p>
        </div>

        <p className="text-muted-foreground">
          HireIQ (“we”, “us”, or “our”) helps you tailor resumes, track job applications, and
          optionally sync status updates from email. This policy explains what we collect and how we
          use it when you use{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="https://hireiq.kingsharif.com">
            hireiq.kingsharif.com
          </a>{' '}
          and related services (including our browser extension).
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Information we collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Account information</strong> — name, email address, and
              authentication details when you sign up with email/password or Google.
            </li>
            <li>
              <strong className="text-foreground">Profile &amp; resume data</strong> — resumes you upload,
              parsed content, profile fields, tailored versions, and application answers you save.
            </li>
            <li>
              <strong className="text-foreground">Job &amp; application data</strong> — jobs you save,
              status, notes, and related activity in your tracker.
            </li>
            <li>
              <strong className="text-foreground">Connected services (optional)</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  <strong className="text-foreground">Google / Gmail</strong> — if you grant access, we
                  use read-only Gmail access to help match employer emails to your applications. We do
                  not send email as you.
                </li>
                <li>
                  <strong className="text-foreground">GitHub</strong> — if you connect GitHub, we read
                  repo metadata to suggest or link projects on your profile.
                </li>
                <li>
                  <strong className="text-foreground">Application (masked) email</strong> — if you create
                  a HireIQ apply address, we receive mail sent to that address to log outreach.
                </li>
              </ul>
            </li>
            <li>
              <strong className="text-foreground">Usage &amp; device data</strong> — basic logs needed to
              operate and secure the service (e.g. IP, timestamps, error diagnostics).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. How we use information</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Provide resume tailoring, ATS scoring, and application tracking</li>
            <li>Autofill assistance via the browser extension when you ask</li>
            <li>Match employer emails to jobs when you enable email tracking</li>
            <li>Improve reliability, security, and support</li>
            <li>Communicate important service notices</li>
          </ul>
          <p className="text-muted-foreground">We do not sell your personal information.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Gmail access (when enabled)</h2>
          <p className="text-muted-foreground">
            If you connect Gmail (including when Google sign-in includes Gmail permission), HireIQ
            requests <code className="text-xs bg-secondary px-1 rounded">gmail.readonly</code> access.
            We use it only to scan for messages that may relate to your tracked applications and to show
            them in your HireIQ inbox. You can disconnect Gmail or turn tracking off in Settings at any
            time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. AI processing</h2>
          <p className="text-muted-foreground">
            Resume parsing and tailoring may send relevant resume and job text to our AI providers
            (currently Anthropic) to generate structured data and suggestions. Do not upload content you
            are not allowed to process.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Service providers</h2>
          <p className="text-muted-foreground">We use trusted processors to run HireIQ, including:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Supabase (database &amp; authentication)</li>
            <li>Vercel (hosting)</li>
            <li>Google (sign-in and optional Gmail)</li>
            <li>GitHub (optional project sync)</li>
            <li>Resend (optional masked application email)</li>
            <li>Anthropic (AI features)</li>
          </ul>
          <p className="text-muted-foreground">
            They process data under their own terms and only as needed to provide HireIQ.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Data retention &amp; deletion</h2>
          <p className="text-muted-foreground">
            We keep your data while your account is active. You can delete your account in Settings,
            which removes your HireIQ account and associated profile data we control. Some backups or
            logs may persist for a limited time for security and legal compliance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Security</h2>
          <p className="text-muted-foreground">
            We use industry-standard safeguards (encryption in transit, access controls, and scoped
            OAuth tokens). No method of transmission or storage is 100% secure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Children’s privacy</h2>
          <p className="text-muted-foreground">
            HireIQ is not directed to children under 13. We do not knowingly collect their data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">9. Your choices</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Update profile and application data in the app</li>
            <li>Disconnect Google, Gmail, or GitHub in Settings</li>
            <li>Switch email tracking to Gmail, masked address, or off</li>
            <li>Delete your account in Settings</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">10. Changes</h2>
          <p className="text-muted-foreground">
            We may update this policy. The “Last updated” date will change when we do. Continued use
            after updates means you accept the revised policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">11. Contact</h2>
          <p className="text-muted-foreground">
            Questions about privacy: email{' '}
            <a className="text-primary underline-offset-2 hover:underline" href="mailto:privacy@kingsharif.com">
              privacy@kingsharif.com
            </a>{' '}
            or contact us via{' '}
            <a className="text-primary underline-offset-2 hover:underline" href="https://hireiq.kingsharif.com">
              hireiq.kingsharif.com
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HireIQ ·{' '}
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          Privacy
        </Link>
      </footer>
    </div>
  )
}
