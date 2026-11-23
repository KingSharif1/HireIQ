import { describe, it, expect } from 'vitest'
import { boardTokenFromUrl, displayCompanyName, humanizeBoardToken } from '@/lib/jobs/company'

describe('company name hygiene', () => {
  it('splits a trailing corporate suffix off a bare board token', () => {
    expect(humanizeBoardToken('freeformfuturecorp')).toBe('Freeformfuture Corp')
    expect(humanizeBoardToken('scaleai')).toBe('Scale AI')
    expect(humanizeBoardToken('acme-corp')).toBe('Acme Corp')
    expect(humanizeBoardToken('stripe')).toBe('Stripe')
  })

  it('reads board tokens from Greenhouse, Lever and Ashby URLs', () => {
    expect(boardTokenFromUrl('https://job-boards.greenhouse.io/freeformfuturecorp/jobs/123')).toBe('freeformfuturecorp')
    expect(boardTokenFromUrl('https://boards.greenhouse.io/embed/job_app?for=acme&token=1')).toBe('acme')
    expect(boardTokenFromUrl('https://jobs.lever.co/leverdemo/abc')).toBe('leverdemo')
    expect(boardTokenFromUrl('https://jobs.ashbyhq.com/ramp/xyz')).toBe('ramp')
    expect(boardTokenFromUrl('https://careers.example.com/jobs/1')).toBeNull()
  })

  it('replaces a stored board token with a readable name, leaves real names alone', () => {
    const url = 'https://job-boards.greenhouse.io/freeformfuturecorp/jobs/123'
    expect(displayCompanyName('freeformfuturecorp', url)).toBe('Freeformfuture Corp')
    expect(displayCompanyName('Unknown', url)).toBe('Freeformfuture Corp')
    expect(displayCompanyName('', url)).toBe('Freeformfuture Corp')
    expect(displayCompanyName('Freeform', url)).toBe('Freeform')
    expect(displayCompanyName('Acme', 'https://careers.example.com/1')).toBe('Acme')
  })
})
