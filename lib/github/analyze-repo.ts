import { generateAiText } from '@/lib/ai/complete'
import { parseModelJson } from '@/lib/ai/parse-json'
import { REPO_INTELLIGENCE_PROMPT } from '@/lib/ai/prompts'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { isResumeWorthyBullet } from './resume-bullet'
import { fileCategory, isImplementationFile, type RepositorySourceSnapshot } from './deep-scan'
import type {
  RepoFeatureEvidence,
  RepoIntelligence,
  RepoResumeHighlight,
  RepoToolEvidence,
} from './types'

function stringValue(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function strings(value: unknown, maxItems: number, maxLength = 300): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => stringValue(item, maxLength)).filter(Boolean).slice(0, maxItems)
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function evidencePaths(value: unknown, allowed: Set<string>): string[] {
  return strings(value, 5, 240).filter(path => allowed.has(path))
}

function normalizeTools(value: unknown, allowed: Set<string>): RepoToolEvidence[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      const raw = objectValue(item)
      return {
        name: stringValue(raw.name, 80),
        usage: stringValue(raw.usage, 300),
        evidencePaths: evidencePaths(raw.evidencePaths, allowed),
      }
    })
    .filter(
      tool =>
        tool.name &&
        tool.usage &&
        tool.evidencePaths.some(path => fileCategory(path) !== 'docs')
    )
    .slice(0, 10)
}

function normalizeFeatures(value: unknown, allowed: Set<string>): RepoFeatureEvidence[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      const raw = objectValue(item)
      return {
        name: stringValue(raw.name, 100),
        detail: stringValue(raw.detail, 350),
        evidencePaths: evidencePaths(raw.evidencePaths, allowed),
      }
    })
    .filter(
      feature =>
        feature.name &&
        feature.detail &&
        feature.evidencePaths.some(isImplementationFile)
    )
    .slice(0, 8)
}

function normalizeHighlights(value: unknown, allowed: Set<string>): RepoResumeHighlight[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      const raw = objectValue(item)
      return {
        text: stringValue(raw.text, 280),
        evidencePaths: evidencePaths(raw.evidencePaths, allowed),
        confidence: raw.confidence === 'high' ? ('high' as const) : ('medium' as const),
      }
    })
    .filter(
      highlight =>
        isResumeWorthyBullet(highlight.text) &&
        !/\b(led|owned|spearheaded|managed|directed)\b/i.test(highlight.text) &&
        highlight.evidencePaths.some(isImplementationFile)
    )
    .slice(0, 4)
}

export function normalizeRepoIntelligence(
  value: unknown,
  allowedFilePaths: string[]
): RepoIntelligence {
  const raw = objectValue(value)
  const allowed = new Set(allowedFilePaths)
  const hasImplementationEvidence = allowedFilePaths.some(isImplementationFile)
  const keyFiles = Array.isArray(raw.keyFiles)
    ? raw.keyFiles
        .map(item => {
          const entry = objectValue(item)
          return {
            path: stringValue(entry.path, 240),
            purpose: stringValue(entry.purpose, 300),
          }
        })
        .filter(file => allowed.has(file.path) && file.purpose)
        .slice(0, 10)
    : []

  const limitations = strings(raw.limitations, 6, 300)
  if (!hasImplementationEvidence) {
    limitations.unshift(
      'Only documentation or metadata was available; no implementation-backed resume highlights were generated.'
    )
  }

  return {
    overview: stringValue(raw.overview, 600),
    architecture: strings(raw.architecture, 8, 300),
    tools: normalizeTools(raw.tools, allowed),
    features: normalizeFeatures(raw.features, allowed),
    keyFiles,
    resumeHighlights: normalizeHighlights(raw.resumeHighlights, allowed),
    limitations: [...new Set(limitations)].slice(0, 6),
  }
}

export async function analyzeRepository(
  userId: string,
  snapshot: RepositorySourceSnapshot
): Promise<RepoIntelligence> {
  if (!snapshot.selectedFiles.length || !snapshot.sourceBundle.trim()) {
    throw new Error('No readable project files were found to analyze.')
  }

  const runtime = await resolveAiRuntime(userId)
  const repoMetadata = JSON.stringify({
    fullName: snapshot.repo.full_name,
    description: snapshot.repo.description,
    topics: snapshot.repo.topics ?? [],
    defaultBranch: snapshot.defaultBranch,
    commitSha: snapshot.commitSha,
    pushedAt: snapshot.repo.pushed_at,
    treeFileCount: snapshot.treeFileCount,
    treeTruncated: snapshot.treeTruncated,
  })
  const prompt = REPO_INTELLIGENCE_PROMPT.replace('{repoMetadata}', repoMetadata).replace(
    '{sourceFiles}',
    snapshot.sourceBundle
  )
  const { text } = await generateAiText({
    runtime,
    feature: 'repo_intelligence',
    tier: 'fast',
    prompt,
    maxOutputTokens: 2600,
  })
  const parsed = parseModelJson<unknown>(text)
  const intelligence = normalizeRepoIntelligence(
    parsed,
    snapshot.selectedFiles.map(file => file.path)
  )
  if (!intelligence.overview) {
    throw new Error('Repository analysis did not produce enough supported evidence.')
  }
  return intelligence
}
