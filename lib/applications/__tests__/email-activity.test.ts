import { describe, expect, it } from 'vitest'
import { buildActivityFeed } from '@/lib/applications/activity'
import { buildInboxThreads } from '@/lib/applications/email'
import { buildOutreachFeed, filterOutreachFeed } from '@/lib/applications/outreach'
import type { ApplicationEmailLogEntry, ApplicationEvent, ApplicationTrackerItem } from '@/types'

const emails: ApplicationEmailLogEntry[] = [
  {
    id: 'one',
    threadId: 'thread',
    subject: 'Interview',
    body: 'First message',
    direction: 'received',
    at: '2026-08-01T12:00:00.000Z',
    isRead: false,
  },
  {
    id: 'two',
    threadId: 'thread',
    subject: 'Re: Interview',
    body: 'My reply',
    direction: 'sent',
    at: '2026-08-02T12:00:00.000Z',
  },
]

describe('application email view models', () => {
  it('groups messages into newest-first threads', () => {
    const threads = buildInboxThreads(emails)
    expect(threads).toHaveLength(1)
    expect(threads[0].messages.map(message => message.id)).toEqual(['one', 'two'])
    expect(threads[0].subject).toBe('Re: Interview')
    expect(threads[0].unread).toBe(true)
  })

  it('does not duplicate emails already represented by linked events', () => {
    const events: ApplicationEvent[] = [
      {
        id: 'event',
        application_id: 'app',
        user_id: 'user',
        event_type: 'email_linked',
        from_status: null,
        to_status: null,
        meta: { emailId: 'two', subject: 'Re: Interview', body: 'My reply' },
        created_at: '2026-08-02T12:00:01.000Z',
      },
    ]

    const feed = buildActivityFeed(events, emails)
    expect(feed.map(item => item.id)).toEqual(['event', 'email-one'])
    expect(feed[0].kind).toBe('email')
  })
})

describe('buildOutreachFeed', () => {
  it('flattens emails across applications newest-first', () => {
    const items = [
      {
        id: 'app-1',
        job_id: 'job-1',
        status: 'applied',
        email_log: [emails[0]],
        job: { title: 'Engineer', company: 'Acme' },
      },
      {
        id: 'app-2',
        job_id: 'job-2',
        status: 'interviewing',
        email_log: [emails[1]],
        job: { title: 'PM', company: 'Beta' },
      },
    ] as unknown as ApplicationTrackerItem[]

    const feed = buildOutreachFeed(items)
    expect(feed).toHaveLength(2)
    expect(feed[0].id).toBe('two')
    expect(feed[0].company).toBe('Beta')
    expect(feed[1].jobTitle).toBe('Engineer')
  })

  it('filters by direction and query', () => {
    const items = [
      {
        id: 'app-1',
        job_id: 'job-1',
        status: 'applied',
        email_log: emails,
        job: { title: 'Engineer', company: 'Acme' },
      },
    ] as unknown as ApplicationTrackerItem[]
    const feed = buildOutreachFeed(items)
    expect(filterOutreachFeed(feed, { direction: 'sent' })).toHaveLength(1)
    expect(filterOutreachFeed(feed, { query: 'acme' })).toHaveLength(2)
    expect(filterOutreachFeed(feed, { query: 'reply' })).toHaveLength(1)
  })
})
