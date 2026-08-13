'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mapSupabaseAuthError } from '@/lib/auth/messages'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(mapSupabaseAuthError(updateError.message))
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthShell title="Choose a new password" description="Enter your new password below">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          placeholder="New password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          disabled={loading}
          autoComplete="new-password"
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
          disabled={loading}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button
          type="submit"
          className="w-full !bg-teal-400 !text-[#042f2e] shadow-lg shadow-teal-900/30 hover:!bg-teal-300"
          disabled={loading}
        >
          {loading ? 'Updating…' : 'Update password'}
        </Button>
        <p className="text-center text-sm text-[var(--mk-mist)]">
          <Link href="/login" className="hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
