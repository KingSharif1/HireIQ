'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mapSupabaseAuthError } from '@/lib/auth/messages'
import { ChevronLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (resetError) {
      setError(mapSupabaseAuthError(resetError.message))
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" description="Password reset link sent">
        <p className="text-sm text-[var(--mk-mist)]">
          If an account exists for <strong className="text-white">{email}</strong>, you&apos;ll get a
          link to reset your password.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm hover:underline">
          Back to sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset password" description="We&apos;ll email you a reset link">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button
          type="submit"
          className="w-full !bg-teal-400 !text-[#042f2e] shadow-lg shadow-teal-900/30 hover:!bg-teal-300"
          disabled={loading || !email.trim()}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
        <Link
          href="/login"
          className="flex items-center justify-center gap-1 text-sm text-[var(--mk-mist)] hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  )
}
