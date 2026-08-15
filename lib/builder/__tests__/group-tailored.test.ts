import { describe, expect, it } from 'vitest'
import { groupTailoredByJob } from '@/lib/builder/group-tailored'

describe('groupTailoredByJob', () => {
  it('groups versions under one job and sorts newest first', () => {
    const groups = groupTailoredByJob([
      {
        id: 'a',
        job_id: 'job-1',
        version: 1,
        tailored_score: 40,
        match_score: null,
        created_at: '2026-08-01T00:00:00Z',
        job_title: 'Engineer',
        company: 'Apple',
        apply_url: 'https://jobs.apple.com/x',
      },
      {
        id: 'b',
        job_id: 'job-1',
        version: 2,
        tailored_score: 59,
        match_score: null,
        created_at: '2026-08-14T00:00:00Z',
        job_title: 'Engineer',
        company: 'Apple',
        apply_url: 'https://jobs.apple.com/x',
      },
      {
        id: 'c',
        job_id: 'job-2',
        version: 1,
        tailored_score: 45,
        match_score: null,
        created_at: '2026-06-14T00:00:00Z',
        job_title: 'FDE',
        company: 'Harper',
      },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].jobId).toBe('job-1')
    expect(groups[0].versions.map(v => v.version)).toEqual([2, 1])
    expect(groups[0].latest.id).toBe('b')
    expect(groups[1].jobTitle).toBe('FDE')
  })

  it('folds the same title and company into one folder even with different job ids', () => {
    const groups = groupTailoredByJob([
      {
        id: 'v2',
        job_id: 'job-a',
        version: 2,
        tailored_score: 45,
        match_score: null,
        created_at: '2026-06-14T00:00:00Z',
        job_title: 'Forward Deployed Engineer',
        company: 'harperinsure',
      },
      {
        id: 'v1',
        job_id: 'job-b',
        version: 1,
        tailored_score: 49,
        match_score: null,
        created_at: '2026-06-14T01:00:00Z',
        job_title: 'Forward Deployed Engineer',
        company: 'harperinsure',
      },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].versions).toHaveLength(2)
    expect(groups[0].versions.map(v => v.id).sort()).toEqual(['v1', 'v2'])
  })
})
