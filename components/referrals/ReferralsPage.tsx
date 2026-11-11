'use client'

import { useMemo, useState } from 'react'
import { ConnectionImport } from '@/components/referrals/ConnectionImport'
import { rankReferralCandidates } from '@/lib/referrals/match'
import { referralStageLabel } from '@/lib/referrals/stages'
import { Button } from '@/components/ui/button'
import type { LinkedInConnection, ReferralStage } from '@/types'

export interface OutreachItem {
  id: string
  connectionId: string | null
  stage: ReferralStage
  messageDraft: string | null
  askedAt: string | null
  repliedAt: string | null
  updatedAt: string
}

export function ReferralsPage({
  connections,
  outreach = [],
}: {
  connections: LinkedInConnection[]
  outreach?: OutreachItem[]
}) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [summary, setSummary] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [items, setItems] = useState<OutreachItem[]>(outreach)
  const [busyId, setBusyId] = useState<string | null>(null)

  const ranked = useMemo(
    () => (company.trim() ? rankReferralCandidates(connections, company) : []),
    [connections, company],
  )

  /** Most recent outreach per connection (the server sends newest first). */
  function latestFor(connectionId: string): OutreachItem | undefined {
    return items.find((item) => item.connectionId === connectionId)
  }

  async function logAsk(connection: LinkedInConnection) {
    setBusyId(connection.id)
    try {
      const res = await fetch('/api/referrals/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connection.id,
          stage: 'intro_asked',
          messageDraft: drafts[connection.id] ?? null,
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | { outreach?: { id: string; stage: ReferralStage; asked_at: string | null; replied_at: string | null; message_draft: string | null; updated_at: string } }
        | null
      const row = json?.outreach
      if (res.ok && row) {
        setItems((current) => [
          {
            id: row.id,
            connectionId: connection.id,
            stage: row.stage,
            messageDraft: row.message_draft,
            askedAt: row.asked_at,
            repliedAt: row.replied_at,
            updatedAt: row.updated_at,
          },
          ...current,
        ])
      }
    } finally {
      setBusyId(null)
    }
  }

  async function advance(item: OutreachItem, stage: ReferralStage) {
    setBusyId(item.connectionId ?? item.id)
    try {
      const res = await fetch('/api/referrals/outreach', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, stage }),
      })
      const json = (await res.json().catch(() => null)) as
        | { outreach?: { stage: ReferralStage; asked_at: string | null; replied_at: string | null; updated_at: string } }
        | null
      const row = json?.outreach
      if (res.ok && row) {
        setItems((current) =>
          current.map((existing) =>
            existing.id === item.id
              ? {
                  ...existing,
                  stage: row.stage,
                  askedAt: row.asked_at,
                  repliedAt: row.replied_at,
                  updatedAt: row.updated_at,
                }
              : existing,
          ),
        )
      }
    } finally {
      setBusyId(null)
    }
  }

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
            const current = latestFor(connection.id)
            const busy = busyId === connection.id
            return (
              <li key={connection.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {name || 'Connection'} <span className="text-muted-foreground">· {connection.position || connection.company}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{reason}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {current ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                        {referralStageLabel(current.stage)}
                      </span>
                    ) : null}
                    <Button size="sm" variant="outline" disabled={loadingId === connection.id} onClick={() => void draft(connection)}>
                      {loadingId === connection.id ? 'Drafting…' : 'Draft intro'}
                    </Button>
                  </div>
                </div>
                {drafts[connection.id] ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/40 p-2 text-xs">{drafts[connection.id]}</pre>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {!current ? (
                    <Button size="sm" disabled={busy} onClick={() => void logAsk(connection)}>
                      Log ask
                    </Button>
                  ) : current.stage === 'intro_asked' ? (
                    <>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void advance(current, 'replied')}>
                        Replied
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void advance(current, 'referred')}>
                        Referred
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void advance(current, 'declined')}>
                        Declined
                      </Button>
                    </>
                  ) : current.stage === 'replied' ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void advance(current, 'referred')}>
                      Mark referred
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Funnel closed.</span>
                  )}
                </div>
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
