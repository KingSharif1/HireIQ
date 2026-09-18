import { describe, expect, it } from 'vitest'
import { normalizeRepoIntelligence } from '@/lib/github/analyze-repo'
import { selectRepositoryFiles, type GitHubTreeItem } from '@/lib/github/deep-scan'
import { isIntelligenceStale } from '@/lib/github/intelligence-store'
import type { RepoIntelligenceRecord } from '@/lib/github/types'

function blob(path: string, size = 1000): GitHubTreeItem {
  return { path, mode: '100644', type: 'blob', sha: `sha-${path}`, size }
}

describe('selectRepositoryFiles', () => {
  it('selects manifests and representative code without secrets or generated files', () => {
    const selected = selectRepositoryFiles([
      blob('.env.local'),
      blob('node_modules/pkg/index.js'),
      blob('apps/web/package.json'),
      blob('main.py'),
      blob('app/api/jobs/route.ts'),
      blob('lib/github/deep-scan.ts'),
      blob('docs/ARCHITECTURE.md'),
      blob('public/logo.png'),
    ]).map(file => file.path)

    expect(selected).toContain('apps/web/package.json')
    expect(selected).toContain('main.py')
    expect(selected).toContain('app/api/jobs/route.ts')
    expect(selected).toContain('lib/github/deep-scan.ts')
    expect(selected).not.toContain('.env.local')
    expect(selected).not.toContain('node_modules/pkg/index.js')
    expect(selected).not.toContain('public/logo.png')
  })
})

describe('normalizeRepoIntelligence', () => {
  it('keeps only claims backed by files that were actually analyzed', () => {
    const result = normalizeRepoIntelligence(
      {
        overview: 'A job application workspace.',
        tools: [
          { name: 'Next.js', usage: 'Serves route handlers.', evidencePaths: ['app/api/jobs/route.ts'] },
          { name: 'Redis', usage: 'Caches everything.', evidencePaths: ['missing.ts'] },
        ],
        features: [],
        keyFiles: [],
        architecture: ['App Router with server route handlers'],
        resumeHighlights: [
          {
            text: 'Implemented job ingestion route handlers that normalize application data for downstream tailoring workflows.',
            evidencePaths: ['app/api/jobs/route.ts'],
            confidence: 'high',
          },
        ],
        limitations: [],
      },
      ['app/api/jobs/route.ts']
    )

    expect(result.tools.map(tool => tool.name)).toEqual(['Next.js'])
    expect(result.resumeHighlights).toHaveLength(1)
    expect(result.resumeHighlights[0]?.evidencePaths).toEqual(['app/api/jobs/route.ts'])
  })

  it('does not turn a profile README into evidence for linked projects', () => {
    const result = normalizeRepoIntelligence(
      {
        overview: 'A GitHub profile page linking to several independent projects.',
        tools: [
          { name: 'Stripe', usage: 'Used by a linked billing project.', evidencePaths: ['README.md'] },
        ],
        features: [
          { name: 'Billing', detail: 'A linked project processes payments.', evidencePaths: ['README.md'] },
        ],
        keyFiles: [{ path: 'README.md', purpose: 'Profile overview' }],
        architecture: [],
        resumeHighlights: [
          {
            text: 'Led development of a production billing platform with Stripe payment workflows.',
            evidencePaths: ['README.md'],
            confidence: 'high',
          },
        ],
        limitations: [],
      },
      ['README.md']
    )

    expect(result.tools).toEqual([])
    expect(result.features).toEqual([])
    expect(result.resumeHighlights).toEqual([])
    expect(result.limitations[0]).toContain('no implementation-backed resume highlights')
  })
})

describe('isIntelligenceStale', () => {
  it('flags a repository pushed after its analyzed snapshot', () => {
    const record = {
      repoPushedAt: '2026-09-16T00:00:00Z',
    } as RepoIntelligenceRecord
    expect(isIntelligenceStale(record, '2026-09-17T00:00:00Z')).toBe(true)
    expect(isIntelligenceStale(record, '2026-09-15T00:00:00Z')).toBe(false)
  })
})
