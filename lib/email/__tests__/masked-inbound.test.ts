import { describe, expect, it } from 'vitest'
import {
  buildForwardSaveEmail,
  buildMaskedEmail,
  buildMaskedLocalPart,
  extractRecipientEmails,
  normalizeMaskedRecipient,
} from '@/lib/email/masked-address'
import { extractSavableJobUrl, extractUrlsFromEmail } from '@/lib/email/extract-job-urls'
import { inferStatusFromEmail, matchInboundToJob } from '@/lib/email/inbound-match'

describe('masked-address', () => {
  it('builds a slug + token local part', () => {
    const local = buildMaskedLocalPart({ firstName: 'Sharif', lastName: 'Ahmed' })
    expect(local).toMatch(/^sharif\.ahmed\.[a-z0-9]{6}$/)
  })

  it('builds full address with domain', () => {
    const email = buildMaskedEmail({
      username: 'kings',
      domain: 'mail.kingsharif.com',
    })
    expect(email).toMatch(/^kings\.[a-z0-9]{6}@mail\.kingsharif\.com$/)
  })

  it('extracts recipients from display-name forms', () => {
    expect(extractRecipientEmails(['HireIQ <test@mail.kingsharif.com>', 'other@x.com'])).toEqual([
      'test@mail.kingsharif.com',
      'other@x.com',
    ])
  })

  it('normalizes recipients', () => {
    expect(normalizeMaskedRecipient(' <A@B.COM> ')).toBe('a@b.com')
  })

  it('builds a save.* forward-to-save address', () => {
    const email = buildForwardSaveEmail({
      firstName: 'Sharif',
      lastName: 'Ahmed',
      domain: 'mail.kingsharif.com',
    })
    expect(email).toMatch(/^save\.sharif\.ahmed\.[a-z0-9]{6}@mail\.kingsharif\.com$/)
  })
})

describe('extract-job-urls', () => {
  it('prefers a Greenhouse URL over tracking and unsubscribe links', () => {
    const url = extractSavableJobUrl(
      'See this role https://job-boards.greenhouse.io/acme/jobs/123 and https://example.com/unsubscribe',
    )
    expect(url).toBe('https://job-boards.greenhouse.io/acme/jobs/123')
  })

  it('unwraps Google redirect URLs', () => {
    const urls = extractUrlsFromEmail(
      'https://www.google.com/url?q=https://jobs.ashbyhq.com/acme/abcd-1234&sa=D',
    )
    expect(urls[0]).toBe('https://jobs.ashbyhq.com/acme/abcd-1234')
  })

  it('reads href from HTML', () => {
    const url = extractSavableJobUrl(
      null,
      '<p>Apply <a href="https://jobs.lever.co/acme/11111111-1111-1111-1111-111111111111">here</a></p>',
    )
    expect(url).toBe('https://jobs.lever.co/acme/11111111-1111-1111-1111-111111111111')
  })

  it('returns null when nothing looks like a job', () => {
    expect(extractSavableJobUrl('Thanks for dinner https://nytimes.com/2026/01/01/food')).toBeNull()
  })
})

describe('inbound-match', () => {
  const candidates = [
    {
      jobId: 'j1',
      applicationId: 'a1',
      company: 'Ascension Health',
      title: 'Engineer',
    },
    {
      jobId: 'j2',
      applicationId: 'a2',
      company: 'Acme Corp',
      title: 'PM',
    },
  ]

  it('matches company in subject', () => {
    const hit = matchInboundToJob(candidates, {
      from: 'noreply@careers.ascension.org',
      subject: 'Thanks for applying to Ascension Health',
    })
    expect(hit?.match.applicationId).toBe('a1')
  })

  it('returns null when no signal', () => {
    expect(
      matchInboundToJob(candidates, {
        from: 'random@newsletter.com',
        subject: 'Weekly digest',
      })
    ).toBeNull()
  })

  it('infers interviewing status', () => {
    const hint = inferStatusFromEmail('Interview invitation', 'We would like to schedule a call')
    expect(hint?.status).toBe('interviewing')
  })
})
