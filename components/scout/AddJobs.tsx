'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type PasteResponse = {
  error?: string
  found?: number
  added?: number
  duplicates?: number
  failed?: Array<{ url: string; reason: string }>
}

export function AddJobs() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  async function submit() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/scout/leads/paste', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json().catch(() => ({}))) as PasteResponse
      if (!res.ok) {
        setMessage({ text: data.error || 'Could not add those links', tone: 'error' })
        return
      }
      const parts = [`Added ${data.added ?? 0}`]
      if (data.duplicates) parts.push(`${data.duplicates} already in your list`)
      if (data.failed?.length) parts.push(`${data.failed.length} could not be added`)
      setMessage({ text: `${parts.join(', ')}.`, tone: (data.added ?? 0) > 0 ? 'ok' : 'error' })
      if ((data.added ?? 0) > 0) {
        setText('')
        router.refresh()
      }
    } catch {
      setMessage({ text: 'Network problem. Try again.', tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add jobs
      </Button>
    )
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <label htmlFor="scout-paste" className="text-sm font-medium">
        Paste job links
      </label>
      <p className="text-xs text-muted-foreground">One per line, or the whole list from the morning scout. Up to 10 at a time.</p>
      <Textarea
        id="scout-paste"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder="https://boards.greenhouse.io/company/jobs/123"
        disabled={busy}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? 'Reading pages' : 'Add jobs'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          Close
        </Button>
      </div>
      {message ? (
        <p role="status" className={message.tone === 'ok' ? 'text-sm' : 'text-sm text-red-500'}>
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
