import { describe, expect, it } from 'vitest'
import { extractApplyLinkFromHtml } from '@/lib/apply/extract-apply-link'
import {
  classifyApplyEase,
  classifyApplyEaseFromJobPage,
  describeApplyEaseForUi,
} from '@/lib/apply/ease'

describe('extractApplyLinkFromHtml', () => {
  it('finds an Apply Now link on a generic careers page', () => {
    const html = `
      <main>
        <h1>Software Engineer</h1>
        <p>We build things.</p>
        <a href="/careers/apply/123">Apply Now</a>
        <a href="https://linkedin.com/share">Share on LinkedIn</a>
      </main>
    `
    const link = extractApplyLinkFromHtml(html, 'https://careers.example.com/jobs/123')
    expect(link).toBe('https://careers.example.com/careers/apply/123')
  })

  it('prefers greenhouse apply links', () => {
    const html = `
      <a href="https://job-boards.greenhouse.io/acme/jobs/99">Apply for this job</a>
    `
    expect(extractApplyLinkFromHtml(html, 'https://acme.com/careers/eng')).toContain('greenhouse.io')
  })
})

describe('classifyApplyEaseFromJobPage', () => {
  it('follows an apply link when the posting page itself is unknown', () => {
    const postingHtml = `
      <h1>Backend Engineer</h1>
      <a href="https://jobs.lever.co/acme/uuid">Apply Now</a>
    `
    const result = classifyApplyEaseFromJobPage({
      pageUrl: 'https://acme.com/careers/backend',
      pageHtml: postingHtml,
    })
    expect(result.ease).toBe('easy')
    expect(result.detectedApplyUrl).toContain('lever.co')
  })

  it('flags signup walls on the apply page HTML', () => {
    const html = `
      <h1>Create an account</h1>
      <p>Sign up to apply</p>
      <input type="email" />
      <input type="password" name="password" />
    `
    const result = classifyApplyEase({ url: 'https://careers.example.com/apply', html })
    expect(result.ease).toBe('hard')
    expect(result.reason).toMatch(/account|sign in/i)
  })
})

describe('describeApplyEaseForUi', () => {
  it('uses plain language for easy vs hard', () => {
    expect(describeApplyEaseForUi({ ease: 'easy', reason: 'scroll and submit' }).title).toMatch(
      /Easy/i,
    )
    expect(describeApplyEaseForUi({ ease: 'hard', reason: 'sign in' }).title).toMatch(/Account/i)
  })
})
