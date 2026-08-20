import { describe, expect, it } from 'vitest'
import { canHostedAutoApply, classifyApplyEase } from '@/lib/apply/ease'

describe('classifyApplyEase', () => {
  it('treats Greenhouse / Lever / Ashby as easy even without HTML', () => {
    expect(
      classifyApplyEase({
        url: 'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008',
      }).hostedAutoApply,
    ).toBe(true)
    expect(classifyApplyEase({ url: 'https://jobs.lever.co/acme/abc' }).ease).toBe('easy')
    expect(classifyApplyEase({ url: 'https://jobs.ashbyhq.com/acme/uuid' }).ease).toBe('easy')
    expect(
      classifyApplyEase({ url: 'https://stripe.com/jobs/search?gh_jid=8077887' }).ease,
    ).toBe('easy')
  })

  it('treats Workday, LinkedIn, Amazon, and Microsoft as hard', () => {
    expect(
      classifyApplyEase({
        url: 'https://acme.wd1.myworkdayjobs.com/en-US/External/job/Remote/Engineer_R1',
      }).hostedAutoApply,
    ).toBe(false)
    expect(
      classifyApplyEase({ url: 'https://www.linkedin.com/jobs/view/1' }).ease,
    ).toBe('hard')
    expect(
      classifyApplyEase({
        url: 'https://www.amazon.jobs/en/jobs/10500800/software-engineer',
      }).ease,
    ).toBe('hard')
  })

  it('uses HTML to detect a simple public form on a generic site', () => {
    const html = `
      <form>
        <input name="first_name" />
        <input name="last_name" />
        <input type="email" name="email" />
        <input type="file" name="resume" />
        <button>Submit</button>
      </form>
    `
    const result = classifyApplyEase({
      url: 'https://careers.example.com/jobs/123',
      html,
    })
    expect(result.ease).toBe('easy')
    expect(result.hostedAutoApply).toBe(true)
  })

  it('uses HTML to detect an account wall', () => {
    const html = `
      <h1>Create an account</h1>
      <p>Sign up to apply</p>
      <input type="email" />
      <input type="password" name="password" />
      <input type="password" name="confirm" />
    `
    const result = classifyApplyEase({
      url: 'https://careers.example.com/apply',
      html,
    })
    expect(result.ease).toBe('hard')
    expect(result.hostedAutoApply).toBe(false)
  })

  it('hides hosted apply for unknown generic URLs without HTML', () => {
    expect(classifyApplyEase({ url: 'https://careers.example.com/jobs/1' }).hostedAutoApply).toBe(
      false,
    )
    expect(classifyApplyEase({ url: 'https://careers.example.com/jobs/1' }).reason).toMatch(
      /not scanned|scan/i,
    )
  })
})

describe('canHostedAutoApply', () => {
  it('prefers stored easy/hard over URL heuristics', () => {
    expect(canHostedAutoApply('https://careers.example.com/x', { apply_ease: 'easy' })).toBe(true)
    expect(
      canHostedAutoApply('https://job-boards.greenhouse.io/x/jobs/1', { apply_ease: 'hard' }),
    ).toBe(false)
  })
})
