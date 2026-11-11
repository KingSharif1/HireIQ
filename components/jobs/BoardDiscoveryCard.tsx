'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface BoardResult {
  board: string
  found: number
  error?: string
}
interface DiscoverResponse {
  ok?: boolean
  error?: string
  boards?: BoardResult[]
  invalid?: string[]
  found?: number
  alreadySaved?: number
  wouldSave?: number
  saved?: number
  postings?: Array<{ title: string; company: string; location: string | null }>
}

/**
 * Import postings straight from employer ATS boards (Greenhouse / Lever / Ashby)
 * instead of adding them one URL at a time.
 */
export function BoardDiscoveryCard({ onImported }: { onImported?: () => void }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null)
  const [result, setResult] = useState<DiscoverResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(dryRun: boolean) {
    const boards = input
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean)
    if (boards.length === 0) {
      setError('Add at least one board, e.g. greenhouse:acme')
      return
    }
    setBusy(dryRun ? 'preview' : 'import')
    setError(null)
    try {
      const res = await fetch('/api/jobs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boards, dryRun }),
      })
      const json = (await res.json().catch(() => null)) as DiscoverResponse | null
      if (!res.ok) {
        setError(json?.error ?? 'Discovery failed')
        setResult(null)
        return
      }
      setResult(json)
      if (!dryRun) onImported?.()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Import from company boards</CardTitle>
        <CardDescription>
          Pull a company&apos;s live postings from Greenhouse, Lever or Ashby — one board per line.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          placeholder={'greenhouse:acme\nhttps://jobs.lever.co/beta\nhttps://jobs.ashbyhq.com/gamma'}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run(true)}>
            {busy === 'preview' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Preview
          </Button>
          <Button size="sm" disabled={busy !== null} onClick={() => void run(false)}>
            {busy === 'import' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Import
          </Button>
        </div>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        {result ? (
          <div className="space-y-2 rounded-lg border border-border p-3 text-xs">
            <p className="font-medium">
              {result.saved != null
                ? `Imported ${result.saved} posting${result.saved === 1 ? '' : 's'}`
                : `Found ${result.found ?? 0} · ${result.wouldSave ?? 0} new`}
              {result.alreadySaved ? ` · ${result.alreadySaved} already saved` : ''}
            </p>
            {result.boards?.map((board) => (
              <p key={board.board} className={board.error ? 'text-red-600' : 'text-muted-foreground'}>
                {board.board}: {board.error ?? `${board.found} postings`}
              </p>
            ))}
            {result.invalid?.length ? (
              <p className="text-amber-700 dark:text-amber-400">Unsupported: {result.invalid.join(', ')}</p>
            ) : null}
            {result.postings?.length ? (
              <ul className="mt-1 space-y-0.5">
                {result.postings.slice(0, 5).map((posting) => (
                  <li key={`${posting.company}-${posting.title}`} className="truncate text-muted-foreground">
                    {posting.title}
                    {posting.location ? ` — ${posting.location}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
