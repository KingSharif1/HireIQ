import { describe, expect, it } from 'vitest'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_VALUES,
  applicationStatusClasses,
  applicationStatusLabel,
  normalizeApplicationStatus,
} from '@/lib/jobs/status'
import { timelineLabel } from '@/lib/applications/activity'
import type { ApplicationEvent } from '@/types'

describe('application statuses (migration 030)', () => {
  it('lists screening after applied and skipped last, matching the DB check constraint', () => {
    expect(APPLICATION_STATUS_VALUES).toEqual([
      'bookmarked',
      'applying',
      'applied',
      'screening',
      'interviewing',
      'negotiating',
      'offer',
      'accepted',
      'rejected',
      'skipped',
    ])
    expect(APPLICATION_STATUSES.map(s => s.label)).toContain('Screening')
    expect(APPLICATION_STATUSES.map(s => s.label)).toContain('Skipped')
  })

  it('keeps screening and skipped instead of collapsing them to bookmarked', () => {
    expect(normalizeApplicationStatus('screening')).toBe('screening')
    expect(normalizeApplicationStatus('skipped')).toBe('skipped')
    expect(applicationStatusLabel('screening')).toBe('Screening')
    expect(applicationStatusLabel('skipped')).toBe('Skipped')
    expect(applicationStatusClasses('screening')).toContain('sky')
  })

  it('labels status changes to and from the new statuses in the timeline', () => {
    const event = { event_type: 'status_change', from_status: 'applied', to_status: 'screening' } as unknown as ApplicationEvent
    expect(timelineLabel(event)).toBe('Applied → Screening')
    const skip = { event_type: 'status_change', from_status: 'bookmarked', to_status: 'skipped' } as unknown as ApplicationEvent
    expect(timelineLabel(skip)).toBe('Bookmarked → Skipped')
  })
})
