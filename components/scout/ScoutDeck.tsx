'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Check, Clock, ExternalLink, Loader2, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, scoreColor } from '@/lib/utils'
import { SOURCE_LABEL, VERDICT_COPY, type ScoutLead } from '@/components/scout/types'

type Decision = 'like' | 'skip' | 'later'

const SWIPE_DISTANCE = 110
const SWIPE_VELOCITY = 500

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function ScoutDeck({ initialLeads }: { initialLeads: ScoutLead[] }) {
  const [leads, setLeads] = useState<ScoutLead[]>(initialLeads)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; href?: string; tone: 'ok' | 'error' } | null>(null)
  const top = leads[0]

  const decide = useCallback(
    async (lead: ScoutLead, decision: Decision) => {
      setBusy(true)
      setNotice(null)
      try {
        const res = await fetch(`/api/scout/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ decision }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string; jobId?: string }
        if (!res.ok) {
          setNotice({ text: data.error || 'Could not save that choice', tone: 'error' })
          return false
        }
        setLeads(prev => prev.filter(l => l.id !== lead.id))
        if (decision === 'like' && data.jobId) {
          // Start tailoring right away; the run keeps going if the user leaves.
          void fetch('/api/tailor/runs', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jobId: data.jobId }),
          }).catch(() => undefined)
          setNotice({ text: `Saved ${lead.title}. Tailoring started.`, href: `/dashboard/tracker/${data.jobId}`, tone: 'ok' })
        }
        return true
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const topRef = useRef(top)
  topRef.current = top
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && /^(input|textarea|select)$/i.test(t.tagName)) return
      const lead = topRef.current
      if (!lead || busy) return
      if (e.key === 'ArrowRight') void decide(lead, 'like')
      else if (e.key === 'ArrowLeft') void decide(lead, 'skip')
      else if (e.key === 'ArrowDown') void decide(lead, 'later')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, decide])

  if (!top) return <EmptyDeck notice={notice} />

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {leads.length} to review. Swipe right to keep and tailor, left to skip, or use the buttons.
      </p>

      <div className="relative h-[34rem] sm:h-[32rem]">
        {leads.slice(1, 3).reverse().map((lead, i, arr) => (
          <div
            key={lead.id}
            aria-hidden
            className="absolute inset-0 rounded-2xl border border-border bg-card shadow-sm"
            style={{ transform: `translateY(${(arr.length - i) * 8}px) scale(${1 - (arr.length - i) * 0.04})`, opacity: 0.7 }}
          />
        ))}
        <SwipeCard key={top.id} lead={top} disabled={busy} onDecide={d => decide(top, d)} onChecked={l => setLeads(prev => prev.map(p => (p.id === l.id ? l : p)))} />
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" className="h-14 w-14 rounded-full" disabled={busy} onClick={() => decide(top, 'skip')} aria-label="Skip this job">
          <X className="h-6 w-6" />
        </Button>
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-full" disabled={busy} onClick={() => decide(top, 'later')} aria-label="Decide later">
          <Clock className="h-5 w-5" />
        </Button>
        <Button variant="success" size="icon" className="h-14 w-14 rounded-full" disabled={busy} onClick={() => decide(top, 'like')} aria-label="Keep and tailor a resume">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">Keyboard: left arrow skips, right arrow keeps, down arrow saves for later.</p>

      <Notice notice={notice} />
    </div>
  )
}

function Notice({ notice }: { notice: { text: string; href?: string; tone: 'ok' | 'error' } | null }) {
  if (!notice) return null
  return (
    <div
      role="status"
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        notice.tone === 'ok' ? 'border-brand-green/30 bg-brand-green/10' : 'border-red-500/30 bg-red-500/10',
      )}
    >
      {notice.text}{' '}
      {notice.href ? (
        <Link href={notice.href} className="font-medium underline">
          Open
        </Link>
      ) : null}
    </div>
  )
}

function EmptyDeck({ notice }: { notice: { text: string; href?: string; tone: 'ok' | 'error' } | null }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <h2 className="text-lg font-semibold">You are all caught up</h2>
        <p className="mt-2 text-sm text-muted-foreground">New jobs show up here from three places.</p>
        <ul className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
          <li>The daily scout, which searches company job pages.</li>
          <li>Indeed or LinkedIn job-alert emails you forward to your HireIQ save address (Settings, Save jobs by email).</li>
          <li>Any job link you paste or save with the extension.</li>
        </ul>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/dashboard/settings">Open settings</Link>
        </Button>
      </div>
      <Notice notice={notice} />
    </div>
  )
}

function SwipeCard({
  lead,
  disabled,
  onDecide,
  onChecked,
}: {
  lead: ScoutLead
  disabled: boolean
  onDecide: (d: Decision) => Promise<boolean>
  onChecked: (lead: ScoutLead) => void
}) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], reduce ? [0, 0] : [-8, 8])
  const keepOpacity = useTransform(x, [20, SWIPE_DISTANCE], [0, 1])
  const skipOpacity = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0])
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  async function runCheck() {
    setChecking(true)
    setCheckError(null)
    try {
      const res = await fetch(`/api/scout/leads/${lead.id}/check`, { method: 'POST' })
      if (!res.ok) throw new Error('Check failed')
      const s = (await res.json()) as {
        liveness: ScoutLead['liveness']
        livenessReason: string
        applyVendor: string | null
        applyVerdict: string | null
        safetyBlocked: boolean
      }
      onChecked({
        ...lead,
        liveness: s.liveness,
        liveness_reason: s.livenessReason,
        apply_vendor: s.applyVendor,
        apply_verdict: s.applyVerdict,
        safety_blocked: s.safetyBlocked,
        checked_at: new Date().toISOString(),
      })
    } catch {
      setCheckError('Could not check that page. Try again or open it yourself.')
    } finally {
      setChecking(false)
    }
  }

  async function settle(d: Decision) {
    const ok = await onDecide(d)
    if (!ok) animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
  }

  const verdict = lead.apply_verdict ? VERDICT_COPY[lead.apply_verdict] : null
  const closed = lead.liveness === 'closed'

  return (
    <motion.article
      className="absolute inset-0 flex cursor-grab touch-pan-y flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lg active:cursor-grabbing"
      style={{ x, rotate }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) void settle('like')
        else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) void settle('skip')
      }}
      aria-label={`${lead.title}${lead.company ? ` at ${lead.company}` : ''}`}
    >
      <motion.span style={{ opacity: keepOpacity }} className="pointer-events-none absolute right-4 top-4 rounded-md border-2 border-brand-green px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-brand-green">
        Keep
      </motion.span>
      <motion.span style={{ opacity: skipOpacity }} className="pointer-events-none absolute left-4 top-4 rounded-md border-2 border-red-500 px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-red-500">
        Skip
      </motion.span>

      <header className="flex items-start justify-between gap-3 pt-6">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-snug [overflow-wrap:anywhere]">{lead.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {[lead.company, lead.location ?? (lead.remote ? 'Remote' : null)].filter(Boolean).join(' · ') || 'Company not listed'}
          </p>
        </div>
        {lead.fit_score !== null ? (
          <div className="shrink-0 text-right">
            <div className={cn('text-3xl font-semibold tabular-nums', scoreColor(lead.fit_score))}>{lead.fit_score}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">fit</div>
          </div>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-border px-2 py-0.5">{SOURCE_LABEL[lead.source]}</span>
        {lead.apply_vendor && lead.apply_vendor !== 'other' ? (
          <span className="rounded-md border border-border px-2 py-0.5 capitalize">{lead.apply_vendor}</span>
        ) : null}
        {lead.liveness === 'live' ? <span className="rounded-md border border-brand-green/30 bg-brand-green/10 px-2 py-0.5">Posting is live</span> : null}
        {closed ? <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5">Looks closed</span> : null}
        {lead.liveness === 'blocked' ? <span className="rounded-md border border-brand-amber/30 bg-brand-amber/10 px-2 py-0.5">Site blocked the check</span> : null}
        {verdict ? (
          <span
            className={cn(
              'rounded-md border px-2 py-0.5',
              verdict.tone === 'good' && 'border-brand-green/30 bg-brand-green/10',
              verdict.tone === 'warn' && 'border-brand-amber/30 bg-brand-amber/10',
              verdict.tone === 'neutral' && 'border-border',
            )}
          >
            {verdict.label}
          </span>
        ) : null}
      </div>

      {lead.safety_blocked ? (
        <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          This posting has hidden text that tries to instruct an AI. It will not be sent to the agent.
        </p>
      ) : null}

      {lead.fit_reasons.length > 0 ? (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why it fits</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {lead.fit_reasons.slice(0, 4).map(r => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {lead.deal_breakers.length > 0 ? (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Heads up</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {lead.deal_breakers.map(r => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={runCheck} disabled={checking || disabled} onPointerDownCapture={e => e.stopPropagation()}>
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {lead.checked_at ? 'Check again' : 'Check employer page'}
        </Button>
        <a
          href={lead.apply_url || lead.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDownCapture={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Open {hostOf(lead.apply_url || lead.source_url) || 'posting'} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      {checkError ? <p className="text-xs text-red-500">{checkError}</p> : null}
      {lead.liveness_reason && lead.checked_at ? <p className="text-xs text-muted-foreground">{lead.liveness_reason}</p> : null}
    </motion.article>
  )
}
