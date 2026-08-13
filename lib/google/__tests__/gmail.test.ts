import { describe, expect, it } from 'vitest'
import { looksLikeNoiseGmail, type GmailParsedMessage } from '@/lib/google/gmail'

function msg(partial: Partial<GmailParsedMessage>): GmailParsedMessage {
  return {
    id: '1',
    threadId: 't',
    from: 'recruiter@acme.com',
    to: ['you@gmail.com'],
    subject: 'Interview',
    snippet: 'hi',
    bodyText: 'hi',
    messageId: null,
    ...partial,
  }
}

describe('looksLikeNoiseGmail', () => {
  it('filters self-sent and common noreply sources', () => {
    expect(looksLikeNoiseGmail(msg({ from: 'You <you@gmail.com>' }), 'you@gmail.com')).toBe(true)
    expect(
      looksLikeNoiseGmail(msg({ from: 'LinkedIn <noreply@linkedin.com>' }), 'you@gmail.com'),
    ).toBe(true)
    expect(looksLikeNoiseGmail(msg({ from: 'Talent <jobs@acme.io>' }), 'you@gmail.com')).toBe(false)
  })
})
