'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { computeHuntPulse, type PulseItem } from '@/lib/applications/pulse'

const PACE_COPY = {
  ahead: { label: 'Ahead of pace', cls: 'text-brand-green' },
  on_pace: { label: 'On pace', cls: 'text-brand-green' },
  behind: { label: 'Behind pace', cls: 'text-amber-600 dark:text-amber-400' },
} as const

function relative(iso: string | null): string {
  if (!iso) return 'No email yet'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

/**
 * Tracker header (issue #30): weekday apply cadence, pipeline, and email watch,
 * plus a ledger import. Computed in the browser so "today" is the user's day.
 */
export function JobHuntPulse({ items, lastEmailAt }: { items: PulseItem[]; lastEmailAt: string | null }) {
  const router = useRouter()
  const pulse = useMemo(() => computeHuntPulse(items, { lastEmailAt }), [items, lastEmailAt])
  const [importOpen, setImportOpen] = useState(false)
  const [ledger, setLedger] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function runImport() {
    setBusy(true)
    setMessage(null)
    try {
      let body: unknown
      try {
        body = JSON.parse(ledger)
      } catch {
        setMessage('That is not valid JSON.')
        return
      }
      const res = await fetch('/api/applications/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        created?: number
        updated?: number
        failed?: number
        error?: string
      }
      if (!res.ok && !data.created && !data.updated) {
        setMessage(data.error || 'Import failed.')
        return
      }
      setMessage(
        `Imported: ${data.created ?? 0} new, ${data.updated ?? 0} updated${data.failed ? `, ${data.failed} failed` : ''}.`,
      )
      setLedger('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const pace = PACE_COPY[pulse.pace]
  const stats: Array<{ label: string; value: string; hint?: string; hintCls?: string }> = [
    { label: 'Applied today', value: String(pulse.appliedToday), hint: 'Target 2–3 per weekday' },
    {
      label: 'This week',
      value: `${pulse.appliedThisWeek}`,
      hint: `${pace.label} · goal ${pulse.weekTargetMin}–${pulse.weekTargetMax}`,
      hintCls: pace.cls,
    },
    {
      label: 'Active pipeline',
      value: String(pulse.active),
      hint: `${pulse.interviewing} interviewing${pulse.ghosted ? ` · ${pulse.ghosted} likely ghosted` : ''}`,
    },
    { label: 'Recruiter replies', value: String(pulse.replies), hint: `Email watch · last email ${relative(pulse.lastEmailAt)}` },
  ]

  return (
    <section aria-label="Job hunt pulse" className="mb-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{s.value}</p>
            {s.hint ? (
              <p className={cn('mt-0.5 text-xs text-muted-foreground', s.hintCls)}>{s.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setImportOpen((v) => !v)} aria-expanded={importOpen}>
          {importOpen ? 'Close import' : 'Import job-hunt ledger'}
        </Button>
        {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
      </div>

      {importOpen ? (
        <div className="mt-2 rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Paste or upload a ledger JSON (<code>{'{ "applications": [{ company, title, url, status, appliedDate }] }'}</code>).
            Re-importing the same URL updates it instead of adding a duplicate.
          </p>
          <Textarea
            value={ledger}
            onChange={(e) => setLedger(e.target.value)}
            rows={6}
            placeholder='{ "applications": [ … ] }'
            className="font-mono text-xs"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setLedger(await file.text())
                e.target.value = ''
              }}
            />
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
              Upload .json
            </Button>
            <Button size="sm" disabled={busy || !ledger.trim()} onClick={() => void runImport()}>
              {busy ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
