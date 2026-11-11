'use client'

import { useMemo, useState } from 'react'
import { ConnectionImport } from '@/components/referrals/ConnectionImport'
import { rankReferralCandidates } from '@/lib/referrals/match'
import { Button } from '@/components/ui/button'
import type { LinkedInConnection } from '@/types'

export function ReferralsPage({ connections }: { connections: LinkedInConnection[] }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [summary, setSummary] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const ranked = useMemo(
    () => (company.trim() ? rankReferralCandidates(connections, company) : []),
    [connections, company],
  )

  async function draft(conn: LinkedInConnection) {
    setLoadingId(conn.id)
    try {
      const res = await fetch('/api/referrals/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionName: `${conn.firstName} ${conn.lastName}`.trim(),
          connectionCompany: conn.company,
          connectionPosition: conn.position,
          targetCompany: company,
          targetRole: role,
          candidateSummary: summary,
          kind: 'warm_intro',
        }),
      })
      const json = await res.json().catch(() => null)
      setDrafts((d) => ({ ...d, [conn.id]: json?.draft ?? json?.error ?? 'Draft failed' }))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Map your LinkedIn network to the companies you&apos;re targeting and draft warm intros. Messages are drafts —
          you send them on LinkedIn.
        </p>
      </div>

      <ConnectionImport />

      <div className="space-y-3 rounded-xl border border-border p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Target company (e.g. Acme)"
            className="h-9 rounded-md border border-border px-3 text-sm"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Target role (optional)"
            className="h-9 rounded-md border border-border px-3 text-sm"
          />
        </div>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Your one-line summary (used in the draft)"
          rows={2}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>

      {ranked.length > 0 ? (
        <ul className="space-y-2">
          {ranked.map(({ connection, strength, reason }) => {
            const name = `${connection.firstName} ${connection.lastName}`.trim()
            return (
              <li key={connection.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {name || 'Connection'} <span className="text-muted-foreground">· {connection.position || connection.company}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{reason}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={loadingId === connection.id} onClick={() => void draft(connection)}>
                    {loadingId === connection.id ? 'Drafting…' : 'Draft intro'}
                  </Button>
                </div>
                {drafts[connection.id] ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/40 p-2 text-xs">{drafts[connection.id]}</pre>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {connections.length === 0
            ? 'Import your LinkedIn connections above to get started.'
            : 'Enter a target company to see who can refer you.'}
        </p>
      )}
    </div>
  )
}
