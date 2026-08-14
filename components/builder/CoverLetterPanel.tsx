'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AiModelHint } from '@/components/ai/AiModelHint'

interface CoverLetterPanelProps {
  jobId?: string | null
  tailoredResumeId?: string | null
  initialLetter?: string
  embedded?: boolean
}

export function CoverLetterPanel({
  jobId,
  tailoredResumeId,
  initialLetter = '',
  embedded = false,
}: CoverLetterPanelProps) {
  const [letter, setLetter] = useState(initialLetter)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getTargetTailoredResume() {
    if (!jobId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')
    const { data: tr } = tailoredResumeId
      ? await supabase
          .from('tailored_resumes')
          .select('id, cover_letter')
          .eq('user_id', user.id)
          .eq('id', tailoredResumeId)
          .maybeSingle()
      : await supabase
          .from('tailored_resumes')
          .select('id, cover_letter')
          .eq('user_id', user.id)
          .eq('job_id', jobId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()
    if (!tr?.id) {
      throw new Error('Create a tailored resume first so the cover letter has a resume context.')
    }
    return { supabase, tr }
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const target = await getTargetTailoredResume()
      if (!target) return
      if (target.tr.cover_letter) setLetter(target.tr.cover_letter)
      const res = await fetch('/api/tailor/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredResumeId: target.tr.id }),
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

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const target = await getTargetTailoredResume()
      if (!target) return
      const { error: updateError } = await target.supabase
        .from('tailored_resumes')
        .update({ cover_letter: letter })
        .eq('id', target.tr.id)
      if (updateError) throw updateError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {embedded ? null : (
      <div>
        <h2 className="text-lg font-semibold">Cover Letter</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate or review the cover letter for this job.
        </p>
      </div>
      )}
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
          <div className="flex flex-wrap gap-2 items-center">
            <Button type="button" size="sm" onClick={() => void generate()} disabled={loading || saving}>
              {loading ? 'Generating…' : 'Generate cover letter'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void save()} disabled={loading || saving}>
              {saving ? 'Saving…' : 'Save edits'}
            </Button>
            <AiModelHint uses="strong" />
          </div>
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
