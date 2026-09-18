'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field } from './primitives'
import { GitHubRepoPicker, CUSTOM, selectedRepoValue } from './GitHubRepoPicker'
import { findRepoForProject } from '@/lib/github/scan-project'
import { isIntelligenceStale } from '@/lib/github/intelligence-store'
import { analyzeGitHubRepository } from '@/lib/api/client'
import type { GitHubRepoSnapshot, RepoIntelligenceRecord } from '@/lib/github/types'
import type { ResumeProject } from '@/types'

interface GitHubRepoFieldProps {
  project: ResumeProject
  repos: GitHubRepoSnapshot[]
  intelligenceByRepoId: Record<number, RepoIntelligenceRecord>
  onChange: (patch: Partial<ResumeProject>) => void
  onAddHighlight: (text: string, sourceLabel: string, technologies: string[]) => void
}

export function GitHubRepoField({
  project,
  repos,
  intelligenceByRepoId,
  onChange,
  onAddHighlight,
}: GitHubRepoFieldProps) {
  const initial = selectedRepoValue(project.github, repos)
  const [mode, setMode] = useState<'pick' | 'custom'>(initial === CUSTOM ? 'custom' : 'pick')
  const [busy, setBusy] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [analyzed, setAnalyzed] = useState<RepoIntelligenceRecord | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(true)

  const sortedRepos = useMemo(
    () => [...repos].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [repos]
  )
  const linkedRepo = useMemo(() => findRepoForProject(project, repos), [project, repos])
  const stored = linkedRepo ? intelligenceByRepoId[linkedRepo.id] : undefined
  const record = analyzed?.repoId === linkedRepo?.id ? analyzed : stored
  const stale = linkedRepo ? isIntelligenceStale(record, linkedRepo.pushedAt) : false

  function applyLink(url: string) {
    onChange({ github: url, source: url ? 'github' : project.source })
    setAnalyzed(null)
    setShowAnalysis(true)
    setScanMessage(null)
  }

  async function analyzeRepo() {
    if (!linkedRepo || busy) return
    setBusy(true)
    setScanMessage(null)
    setShowAnalysis(true)
    try {
      const result = await analyzeGitHubRepository(linkedRepo.id, Boolean(record && !stale))
      setAnalyzed(result.record)
      setScanMessage(
        result.cached
          ? 'This analysis already matches the latest repository commit.'
          : `Analyzed ${result.record.analyzedFileCount} useful files.`
      )
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : 'Repository analysis failed.')
    } finally {
      setBusy(false)
    }
  }

  function addHighlight(text: string) {
    if (!record?.intelligence || !linkedRepo) return
    onAddHighlight(
      text,
      `${linkedRepo.fullName}@${record.commitSha.slice(0, 7)}`,
      record.intelligence.tools.map(tool => tool.name)
    )
    setScanMessage('Added. Save the profile when you’re ready.')
  }

  const linked = Boolean(project.github.trim())
  const showPicker = sortedRepos.length > 0
  const showCustom = !showPicker || mode === 'custom' || selectedRepoValue(project.github, repos) === CUSTOM

  return (
    <Field
      label="Repository"
      hint={
        showPicker
          ? 'Linking is free. Analyze sends selected, non-secret project files to your configured AI and caches the result by commit.'
          : 'Paste a GitHub URL, or connect GitHub above to pick from your repos.'
      }
    >
      {showPicker && !showCustom ? (
        <GitHubRepoPicker
          repos={sortedRepos}
          value={project.github}
          onChange={(url) => {
            if (url === CUSTOM) {
              setMode('custom')
              return
            }
            setMode('pick')
            applyLink(url)
          }}
        />
      ) : (
        <Input
          value={project.github}
          onChange={e => applyLink(e.target.value)}
          placeholder="https://github.com/…"
        />
      )}
      {showPicker && showCustom ? (
        <button
          type="button"
          className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setMode('pick')}
        >
          Choose from my repos
        </button>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!linked || !linkedRepo || busy}
          onClick={analyzeRepo}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {stale ? 'Analyze updates' : record ? 'Analyze again' : 'Analyze repository'}
        </Button>
        {record && !showAnalysis ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowAnalysis(true)}>
            View analysis
          </Button>
        ) : null}
      </div>

      {!linkedRepo && linked ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Choose this repository from your synced list before analyzing it.
        </p>
      ) : null}
      {scanMessage ? <p className="mt-2 text-xs text-muted-foreground">{scanMessage}</p> : null}

      {record?.intelligence && showAnalysis ? (
        <div className="mt-3 space-y-3 rounded-lg border border-brand-green/25 bg-brand-green/5 p-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-green">
                Repository understood
              </p>
              <span className="font-mono text-[11px] text-muted-foreground">
                {record.commitSha.slice(0, 7)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {record.intelligence.overview}
            </p>
          </div>

          {record.intelligence.tools.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-foreground">How the tools are used</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {record.intelligence.tools.slice(0, 5).map(tool => (
                  <li key={`${tool.name}-${tool.evidencePaths[0]}`}>
                    <span className="font-medium text-foreground">{tool.name}:</span> {tool.usage}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Resume-ready evidence</p>
            {record.intelligence.resumeHighlights.length > 0 ? (
              record.intelligence.resumeHighlights.map(highlight => {
                const alreadyAdded = project.bullets.some(
                  bullet => bullet.trim().toLowerCase() === highlight.text.toLowerCase()
                )
                return (
                  <div
                    key={`${highlight.text}-${highlight.evidencePaths[0]}`}
                    className="rounded-md border border-border bg-card p-2.5"
                  >
                    <p className="text-sm leading-relaxed text-foreground">{highlight.text}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      Evidence: {highlight.evidencePaths.join(', ')}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      variant={alreadyAdded ? 'outline' : 'default'}
                      disabled={alreadyAdded}
                      onClick={() => addHighlight(highlight.text)}
                    >
                      {alreadyAdded ? 'Added' : 'Add to project'}
                    </Button>
                  </div>
                )
              })
            ) : (
              <p className="rounded-md border border-border bg-card p-2.5 text-xs text-muted-foreground">
                No implementation-backed resume highlights were found in the analyzed files.
              </p>
            )}
          </div>

          {record.intelligence.limitations.length > 0 ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Limitation: {record.intelligence.limitations[0]}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <p className="text-[11px] text-muted-foreground">
              Based on {record.analyzedFileCount} selected files
              {record.treeTruncated ? ' · large repository, partial tree' : ''}.
            </p>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAnalysis(false)}>
              Hide
            </Button>
          </div>
        </div>
      ) : null}
    </Field>
  )
}
