import { z } from 'zod'
import type { ApplicationStatus } from '@/types'

/**
 * Job-hunt ledger import (issue #30). Accepts the JSON ledger shape from
 * docs/JOB_HUNT_TRACKER.md (`{ cadence?, applications: [...] }`) and turns each
 * entry into a job + tracker status. Pure parsing/planning lives here; the
 * route does the writes for the signed-in user only.
 */

const entrySchema = z.object({
  company: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(500),
  url: z.string().trim().url().max(2000),
  location: z.string().trim().max(500).nullish(),
  status: z.string().trim().min(1).max(40),
  appliedDate: z.string().trim().nullish(),
  emailNote: z.string().trim().max(1000).nullish(),
  nextStep: z.string().trim().max(1000).nullish(),
  skipReason: z.string().trim().max(1000).nullish(),
})

export const ledgerSchema = z.object({
  cadence: z
    .object({ weekdayTargetMin: z.number().int().min(0).max(50), weekdayTargetMax: z.number().int().min(0).max(50) })
    .optional(),
  applications: z.array(entrySchema).min(1).max(200),
})

export type LedgerEntry = z.infer<typeof entrySchema>

/** Ledger statuses → DB statuses ('ghosted' stays derived: applied + no reply). */
const STATUS_MAP: Record<string, ApplicationStatus> = {
  queued: 'bookmarked',
  bookmarked: 'bookmarked',
  saved: 'bookmarked',
  skipped: 'skipped',
  applying: 'applying',
  applied: 'applied',
  ghosted: 'applied',
  screen: 'screening',
  screening: 'screening',
  recruiter_screen: 'screening',
  interview: 'interviewing',
  interviewing: 'interviewing',
  negotiating: 'negotiating',
  offer: 'offer',
  accepted: 'accepted',
  rejected: 'rejected',
}

export interface PlannedImport {
  company: string
  title: string
  url: string
  location: string | null
  status: ApplicationStatus
  /** ISO timestamp, only for submitted statuses. */
  appliedAt: string | null
  notes: string | null
}

export function mapLedgerStatus(raw: string): ApplicationStatus {
  return STATUS_MAP[raw.toLowerCase()] ?? 'bookmarked'
}

function toIso(date: string | null | undefined): string | null {
  if (!date) return null
  // Date-only values land at local noon-ish UTC so they never shift a day.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T17:00:00.000Z`) : new Date(date)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function planLedgerImport(entries: readonly LedgerEntry[]): PlannedImport[] {
  return entries.map((e) => {
    const status = mapLedgerStatus(e.status)
    const raw = e.status.toLowerCase()
    const notes = [
      raw === 'skipped' ? `Skipped${e.skipReason ? `: ${e.skipReason}` : ''}` : null,
      e.emailNote ? `Email: ${e.emailNote}` : null,
      e.nextStep ? `Next: ${e.nextStep}` : null,
    ]
      .filter(Boolean)
      .join('\n')
    const submitted = status !== 'bookmarked' && status !== 'applying' && status !== 'skipped'
    return {
      company: e.company,
      title: e.title,
      url: e.url,
      location: e.location ?? null,
      status,
      appliedAt: submitted ? toIso(e.appliedDate) : null,
      notes: notes || null,
    }
  })
}
