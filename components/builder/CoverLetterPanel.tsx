'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CoverLetterPanelProps {
  jobId?: string | null
}

export function CoverLetterPanel({ jobId }: CoverLetterPanelProps) {
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!jobId) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { data: tr } = await supabase
        .from('tailored_resumes')
        .select('id, cover_letter')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!tr?.id) {
        throw new Error('Save inclusion in Job Matcher first so a tailored resume exists.')
      }
      if (tr.cover_letter) {
        setLetter(tr.cover_letter)
      }
      const res = await fetch('/api/tailor/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredResumeId: tr.id }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || 'Generation failed')
      }
      const text = await res.text()
      setLetter(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Cover Letter</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a letter for the job open in Job Matcher.
        </p>
      </div>
      {!jobId ? (
        <p className="text-sm text-muted-foreground">
          Select a job in the{' '}
          <Link href="/dashboard/tracker" className="underline">
            Applications
          </Link>{' '}
          tracker, then open Documents to match.
        </p>
      ) : (
        <>
          <Button type="button" size="sm" onClick={() => void generate()} disabled={loading}>
            {loading ? 'Generating…' : 'Generate cover letter'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Textarea
            value={letter}
            onChange={e => setLetter(e.target.value)}
            rows={16}
            placeholder="Your cover letter will appear here…"
          />
        </>
      )}
    </div>
  )
}
