'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field } from './primitives'
import { GitHubRepoPicker, CUSTOM, selectedRepoValue } from './GitHubRepoPicker'
import { scanLinkedRepo } from '@/lib/github/scan-project'
import type { GitHubRepoSnapshot } from '@/lib/github/types'
import type { ResumeProject } from '@/types'

interface GitHubRepoFieldProps {
  project: ResumeProject
  repos: GitHubRepoSnapshot[]
  onChange: (patch: Partial<ResumeProject>) => void
}

export function GitHubRepoField({ project, repos, onChange }: GitHubRepoFieldProps) {
  const initial = selectedRepoValue(project.github, repos)
  const [mode, setMode] = useState<'pick' | 'custom'>(initial === CUSTOM ? 'custom' : 'pick')
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [proposed, setProposed] = useState<{ bullet: string; extraTechnologies: string[] } | null>(
    null
  )

  const sortedRepos = useMemo(
    () => [...repos].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [repos]
  )

  function applyLink(url: string) {
    onChange({ github: url, source: url ? 'github' : project.source })
    setProposed(null)
    setScanMessage(null)
  }

  function lookForHighlights() {
    const result = scanLinkedRepo(project, repos)
    if (result.kind === 'none') {
      setProposed(null)
      setScanMessage(result.message)
      return
    }
    setScanMessage(null)
    setProposed({ bullet: result.bullet, extraTechnologies: result.extraTechnologies })
  }

  function addHighlight() {
    if (!proposed) return
    const bullets = [...project.bullets.filter(b => b.trim()), proposed.bullet]
    const technologies = [...project.technologies]
    for (const tech of proposed.extraTechnologies) {
      if (!technologies.some(t => t.toLowerCase() === tech.toLowerCase())) technologies.push(tech)
    }
    onChange({ bullets, technologies })
    setProposed(null)
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
          ? 'Pick a repo to link it. Looking for highlights is optional.'
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
          disabled={!linked}
          onClick={lookForHighlights}
        >
          Look for highlights
        </Button>
      </div>

      {scanMessage ? <p className="mt-2 text-xs text-muted-foreground">{scanMessage}</p> : null}

      {proposed ? (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs font-medium text-foreground">Suggested highlight</p>
          <p className="text-sm leading-relaxed text-foreground">{proposed.bullet}</p>
          {proposed.extraTechnologies.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Also add tools: {proposed.extraTechnologies.join(', ')}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addHighlight}>
              Add to project
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setProposed(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </Field>
  )
}
