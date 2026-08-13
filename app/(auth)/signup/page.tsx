'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mapSupabaseAuthError } from '@/lib/auth/messages'
import { googleSignInOAuthOptions } from '@/lib/auth/google-sign-in'
import { Globe, Zap } from 'lucide-react'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(mapSupabaseAuthError(signUpError.message))
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  async function handleGoogleSignup() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: googleSignInOAuthOptions(`${window.location.origin}/auth/callback`),
    })
    if (oauthError) {
      setError(mapSupabaseAuthError(oauthError.message))
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="marketing relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <MarketingAtmosphere />
        <div className="relative z-10 w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-[var(--mk-panel)] p-10 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/20">
            <Zap className="h-7 w-7 text-teal-300" />
          </div>
          <h2 className="font-display text-xl font-semibold text-white">Check your email</h2>
          <p className="text-sm text-[var(--mk-mist)]">
            We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to
            activate your account.
          </p>
          <Link href="/login" className="inline-block text-sm text-teal-300 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      description="Get started in under a minute"
      tagline="Tailor resumes. Track applications. Get interviews."
    >
      <div className="space-y-4">
        <Button
          variant="outline"
          className="auth-google w-full !border-white/15 !bg-white/5 !text-[#e8eef5] hover:!bg-white/10"
          onClick={handleGoogleSignup}
          disabled={loading}
          type="button"
        >
          <Globe className="w-4 h-4" />
          Sign up with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="auth-divider-label bg-transparent px-2">or</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={loading}
              autoComplete="given-name"
            />
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={loading}
              autoComplete="family-name"
            />
          </div>
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" className="auth-primary w-full !bg-teal-400 !text-[#042f2e] shadow-lg shadow-teal-900/30 hover:!bg-teal-300" disabled={loading}>
            {loading ? 'Creating account…' : 'Create free account'}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--mk-mist)]">
          Already have an account?{' '}
          <Link href="/login" className="hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
