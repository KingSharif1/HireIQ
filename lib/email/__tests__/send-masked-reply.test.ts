import { describe, expect, it } from 'vitest'
import { extractBareEmail, replySubject } from '@/lib/email/send-masked-reply'

describe('send-masked-reply helpers', () => {
  it('extracts bare emails from display-name forms', () => {
    expect(extractBareEmail('Recruiter <jobs@acme.com>')).toBe('jobs@acme.com')
    expect(extractBareEmail('jobs@acme.com')).toBe('jobs@acme.com')
    expect(extractBareEmail('not-an-email')).toBeNull()
  })

  it('prefixes Re: once', () => {
    expect(replySubject('Interview')).toBe('Re: Interview')
    expect(replySubject('Re: Interview')).toBe('Re: Interview')
    expect(replySubject('re: follow up')).toBe('re: follow up')
  })
})
