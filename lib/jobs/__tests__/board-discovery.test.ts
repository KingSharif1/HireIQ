import { describe, it, expect } from 'vitest'
import {
  parseBoardInput,
  parseBoard,
  parseGreenhouseBoard,
  parseLeverBoard,
  parseAshbyBoard,
  dedupePostings,
  htmlToText,
  detectRemoteType,
  endpointFor,
} from '@/lib/jobs/board-discovery'

describe('parseBoardInput', () => {
  it('parses greenhouse board urls', () => {
    expect(parseBoardInput('https://job-boards.greenhouse.io/acme')?.token).toBe('acme')
    expect(parseBoardInput('https://boards.greenhouse.io/acme?x=1')?.provider).toBe('greenhouse')
  })

  it('parses lever board urls', () => {
    const endpoint = parseBoardInput('https://jobs.lever.co/beta')
    expect(endpoint?.provider).toBe('lever')
    expect(endpoint?.token).toBe('beta')
  })

  it('parses ashby board urls', () => {
    expect(parseBoardInput('https://jobs.ashbyhq.com/gamma')?.provider).toBe('ashby')
  })

  it('accepts a provider:token pair', () => {
    expect(parseBoardInput('lever:acme')).toMatchObject({ provider: 'lever', token: 'acme' })
  })

  it('rejects unknown hosts and empty input', () => {
    expect(parseBoardInput('https://example.com/careers')).toBeNull()
    expect(parseBoardInput('   ')).toBeNull()
  })
})

describe('endpointFor', () => {
  it('builds the documented board api urls', () => {
    expect(endpointFor('greenhouse', 'acme').url).toContain('boards-api.greenhouse.io/v1/boards/acme/jobs')
    expect(endpointFor('lever', 'acme').url).toContain('api.lever.co/v0/postings/acme')
    expect(endpointFor('ashby', 'acme').url).toContain('api.ashbyhq.com/posting-api/job-board/acme')
  })
})

describe('htmlToText', () => {
  it('strips tags and decodes common entities', () => {
    expect(htmlToText('<p>Hello&nbsp;<b>world</b></p><p>Second</p>')).toBe('Hello world\nSecond')
  })

  it('handles null', () => {
    expect(htmlToText(null)).toBe('')
  })
})

describe('detectRemoteType', () => {
  it('classifies remote/hybrid/onsite', () => {
    expect(detectRemoteType('Remote - US')).toBe('remote')
    expect(detectRemoteType('Hybrid, Austin')).toBe('hybrid')
    expect(detectRemoteType('On-site')).toBe('onsite')
    expect(detectRemoteType('Austin, TX')).toBeNull()
  })
})

describe('parseGreenhouseBoard', () => {
  const fixture = {
    jobs: [
      {
        id: 101,
        title: 'Software Engineer',
        absolute_url: 'https://boards.greenhouse.io/acme/jobs/101',
        updated_at: '2026-11-01T10:00:00-04:00',
        location: { name: 'Remote - US' },
        content: '<p>Build things.</p>',
      },
      { id: 102, title: 'No URL job' },
    ],
  }

  it('normalizes postings and drops entries without a url', () => {
    const out = parseGreenhouseBoard(fixture, 'Acme')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      provider: 'greenhouse',
      externalId: '101',
      title: 'Software Engineer',
      company: 'Acme',
      location: 'Remote - US',
      remoteType: 'remote',
      applyUrl: 'https://boards.greenhouse.io/acme/jobs/101',
    })
    expect(out[0].description).toBe('Build things.')
  })
})

describe('parseLeverBoard', () => {
  it('reads categories.location and hostedUrl', () => {
    const out = parseLeverBoard(
      [
        {
          id: 'abc',
          text: 'Backend Engineer',
          hostedUrl: 'https://jobs.lever.co/acme/abc',
          createdAt: 1730000000000,
          categories: { location: 'Austin, TX', commitment: 'Full-time' },
          descriptionPlain: 'Do backend things.',
        },
      ],
      'Acme',
    )
    expect(out[0]).toMatchObject({
      provider: 'lever',
      externalId: 'abc',
      title: 'Backend Engineer',
      location: 'Austin, TX',
      applyUrl: 'https://jobs.lever.co/acme/abc',
      description: 'Do backend things.',
    })
    expect(out[0].remoteType).toBeNull()
  })
})

describe('parseAshbyBoard', () => {
  it('honours isRemote and jobUrl', () => {
    const out = parseAshbyBoard(
      {
        jobs: [
          {
            id: 'a1',
            title: 'Data Engineer',
            location: 'New York',
            isRemote: true,
            jobUrl: 'https://jobs.ashbyhq.com/gamma/a1',
            descriptionPlain: 'Data pipelines.',
          },
        ],
      },
      'Gamma',
    )
    expect(out[0]).toMatchObject({
      provider: 'ashby',
      externalId: 'a1',
      company: 'Gamma',
      remoteType: 'remote',
      applyUrl: 'https://jobs.ashbyhq.com/gamma/a1',
    })
  })
})

describe('parseBoard dispatch', () => {
  it('uses the provider parser', () => {
    expect(parseBoard('lever', [], { token: 'acme' })).toEqual([])
    expect(parseBoard('greenhouse', { jobs: [] }, { token: 'acme' })).toEqual([])
  })
})

describe('dedupePostings', () => {
  it('keeps the first occurrence of each apply url', () => {
    const base = {
      provider: 'greenhouse' as const,
      externalId: '1',
      title: 'A',
      company: 'Acme',
      location: null,
      remoteType: null,
      description: '',
      postedAt: null,
    }
    const out = dedupePostings([
      { ...base, applyUrl: 'https://x/1' },
      { ...base, externalId: '2', title: 'B', applyUrl: 'https://x/1/' },
      { ...base, externalId: '3', title: 'C', applyUrl: 'https://x/2' },
    ])
    expect(out.map((p) => p.title)).toEqual(['A', 'C'])
  })
})
