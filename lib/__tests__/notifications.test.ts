import { describe, expect, it } from 'vitest'
import {
  buildSuggestionNotification,
  buildTailorCompleteNotification,
  formatUnreadCount,
  pendingClearedForTailorRun,
  profileSectionLink,
  sortNotificationsUnreadFirst,
} from '@/lib/notifications'
import type { Notification } from '@/types'

describe('formatUnreadCount', () => {
  it('returns empty for zero', () => {
    expect(formatUnreadCount(0)).toBe('')
  })

  it('caps at 99+', () => {
    expect(formatUnreadCount(100)).toBe('99+')
    expect(formatUnreadCount(42)).toBe('42')
  })
})

describe('buildTailorCompleteNotification', () => {
  it('links to tailor result page', () => {
    const row = buildTailorCompleteNotification('user-1', 'SE @ Acme', 'tailor-abc')
    expect(row.type).toBe('tailor_complete')
    expect(row.link).toBe('/dashboard/tailor/tailor-abc')
    expect(row.ref_id).toBe('tailor-abc')
  })
})

describe('buildSuggestionNotification', () => {
  it('uses plural copy and profile deep link', () => {
    const row = buildSuggestionNotification('user-1', 'SE @ Acme', 'tailor-abc', 2, 'experience')
    expect(row.title).toContain('2 profile suggestions')
    expect(row.link).toBe(profileSectionLink('experience'))
  })
})

describe('pendingClearedForTailorRun', () => {
  it('is true when no pending items reference the tailor run', () => {
    expect(
      pendingClearedForTailorRun(
        [{ sourceTailoredResumeId: 'other' }],
        'tailor-abc'
      )
    ).toBe(true)
    expect(
      pendingClearedForTailorRun(
        [{ sourceTailoredResumeId: 'tailor-abc' }],
        'tailor-abc'
      )
    ).toBe(false)
  })
})

describe('sortNotificationsUnreadFirst', () => {
  it('puts unread items first then newest', () => {
    const items: Notification[] = [
      {
        id: '1',
        user_id: 'u',
        type: 'tailor_complete',
        title: 'read old',
        body: null,
        link: null,
        ref_id: null,
        read: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        user_id: 'u',
        type: 'suggestion',
        title: 'unread new',
        body: null,
        link: null,
        ref_id: null,
        read: false,
        created_at: '2026-06-01T00:00:00Z',
      },
      {
        id: '3',
        user_id: 'u',
        type: 'suggestion',
        title: 'unread old',
        body: null,
        link: null,
        ref_id: null,
        read: false,
        created_at: '2026-01-02T00:00:00Z',
      },
    ]
    const sorted = sortNotificationsUnreadFirst(items)
    expect(sorted.map(n => n.id)).toEqual(['2', '3', '1'])
  })
})
