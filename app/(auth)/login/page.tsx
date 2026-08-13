'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authErrorMessage, mapSupabaseAuthError } from '@/lib/auth/messages'
import { googleSignInOAuthOptions } from '@/lib/auth/google-sign-in'
import { Globe } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('error')
    const msg = authErrorMessage(code)
    if (msg) setError(msg)
  }, [searchParams])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(mapSupabaseAuthError(signInError.message))
      setLoading(false)
    } else {
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const next = searchParams.get('next')
    const redirectNext =
      next && next.startsWith('/')
        ? `?next=${encodeURIComponent(next)}`
        : ''
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: googleSignInOAuthOptions(
        `${window.location.origin}/auth/callback${redirectNext}`,
      ),
    })
    if (oauthError) {
      setError(mapSupabaseAuthError(oauthError.message))
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your account"
      tagline="The resume tailor that actually gets you interviews"
    >
      <div className="space-y-4">
        <Button
          variant="outline"
          className="auth-google w-full !border-white/15 !bg-white/5 !text-[#e8eef5] hover:!bg-white/10"
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
        >
          <Globe className="w-4 h-4" />
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="auth-divider-label bg-transparent px-2">or</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-3">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs hover:underline">
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" className="auth-primary w-full !bg-teal-400 !text-[#042f2e] shadow-lg shadow-teal-900/30 hover:!bg-teal-300" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--mk-mist)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="hover:underline">
            Sign up free
          </Link>
        </p>
        <p className="text-center text-xs text-[var(--mk-mist)]">
          <Link href="/privacy" className="hover:underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
