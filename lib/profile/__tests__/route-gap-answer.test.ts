import { describe, expect, it } from 'vitest'
import {
  extractLikelyEmployer,
  polishResumeBullet,
  routeGapAnswer,
} from '@/lib/profile/route-gap-answer'

const profile = {
  experience: [
    { id: 'exp-harper', company: 'Harper', title: 'Forward Deployed Engineer' },
  ],
  projects: [{ id: 'proj-nemt', name: 'NEMT Billing' }],
}

describe('extractLikelyEmployer', () => {
  it('pulls IRC out of a chatty answer', () => {
    expect(extractLikelyEmployer('yeah I worked at the IRC doing case work')).toMatch(/IRC/i)
  })
})

describe('polishResumeBullet', () => {
  it('drops chat filler and leading I', () => {
    const line = polishResumeBullet('yeah I supported resettlement cases at the IRC')
    expect(line.toLowerCase()).not.toMatch(/^yeah/)
    expect(line.toLowerCase()).not.toMatch(/^i /)
    expect(line).toMatch(/[A-Z]/)
  })
})

describe('routeGapAnswer', () => {
  it('sends NEMT answers to that project, not Harper', () => {
    const routed = routeGapAnswer({
      questionId: 'q1',
      question: 'Did you use Stripe on a billing project?',
      answer: 'I built invoicing for NEMT Billing with Stripe and Strapi',
      jobTitle: 'Forward Deployed Engineer',
      profile,
      addedLines: [
        {
          text: 'Built invoicing with Stripe at Harper for dispatchers.',
          section: 'experience',
          expId: 'exp-harper',
        },
      ],
    })
    expect(routed.section).toBe('projects')
    expect(routed.targetEntryId).toBe('proj-nemt')
  })

  it('treats IRC as a new job instead of Harper', () => {
    const routed = routeGapAnswer({
      questionId: 'q2',
      question: 'Any other relevant work?',
      answer: 'I worked at the IRC helping with resettlement operations',
      jobTitle: 'Forward Deployed Engineer',
      profile,
      addedLines: [
        {
          text: 'Supported operations as a Forward Deployed Engineer at Harper.',
          section: 'experience',
          expId: 'exp-harper',
        },
      ],
    })
    expect(routed.section).toBe('experience')
    expect(routed.targetEntryId).toBeUndefined()
    expect(routed.newExperience?.company.toLowerCase()).toContain('irc')
    expect(routed.proposedText.toLowerCase()).not.toContain('harper')
  })

  it('keeps a Harper-specific answer on Harper', () => {
    const routed = routeGapAnswer({
      questionId: 'q3',
      question: 'Did you do customer deployments at Harper?',
      answer: 'At Harper I shipped on-site deploy tooling for brokers',
      jobTitle: 'Forward Deployed Engineer',
      profile,
    })
    expect(routed.targetEntryId).toBe('exp-harper')
  })

  it('prefers the tailored rewrite when it matches the answer', () => {
    const routed = routeGapAnswer({
      questionId: 'q4',
      answer: 'I cut invoice time by 40 percent on NEMT Billing using Stripe',
      jobTitle: 'Engineer',
      profile,
      addedLines: [
        {
          text: 'Cut NEMT Billing invoice time 40% with Stripe checkout and Strapi.',
          section: 'projects',
          projId: 'proj-nemt',
        },
      ],
    })
    expect(routed.proposedText).toContain('40%')
    expect(routed.proposedText.toLowerCase()).not.toContain('i cut')
    expect(routed.targetEntryId).toBe('proj-nemt')
  })
})
