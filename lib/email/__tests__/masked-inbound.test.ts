import { describe, expect, it } from 'vitest'
import {
  buildMaskedEmail,
  buildMaskedLocalPart,
  extractRecipientEmails,
  normalizeMaskedRecipient,
} from '@/lib/email/masked-address'
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
