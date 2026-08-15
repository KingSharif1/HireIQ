'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GitHubRepoPicker } from './GitHubRepoPicker'
import { projectFromRepo } from '@/lib/github/scan-project'
import { uid } from '@/lib/profile/data'
import type { GitHubRepoSnapshot } from '@/lib/github/types'
import type { ResumeProject } from '@/types'

export function GitHubAddProject({
  repos,
  existing,
  onAdd,
}: {
  repos: GitHubRepoSnapshot[]
  existing: ResumeProject[]
  onAdd: (project: ResumeProject) => void
}) {
  const [open, setOpen] = useState(false)
  const [pickedUrl, setPickedUrl] = useState('')

  const unused = useMemo(() => {
    return repos.filter(
      repo =>
        !existing.some(
          p =>
            p.github?.includes(repo.fullName) ||
            p.github?.replace(/\/$/, '') === repo.htmlUrl.replace(/\/$/, '') ||
            p.name.toLowerCase().replace(/[^a-z0-9]/g, '') ===
              repo.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        )
    )
  }, [repos, existing])

  if (repos.length === 0) return null

  function addFromRepo(url: string, repo?: GitHubRepoSnapshot) {
    const match = repo ?? repos.find(r => r.htmlUrl === url)
    if (!match) return
    onAdd(projectFromRepo(match, uid('proj')))
    setPickedUrl('')
    setOpen(false)
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Add from GitHub</p>
          <p className="text-xs text-muted-foreground">
            Pick a repo and we’ll fill name, stack, and a highlight from the last sync.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(o => !o)}>
          {open ? 'Cancel' : 'Add from GitHub'}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 space-y-2">
          {unused.length === 0 ? (
            <p className="text-xs text-muted-foreground">Every synced repo is already on your profile.</p>
          ) : (
            <>
              <GitHubRepoPicker
                repos={unused}
                value={pickedUrl}
                allowNone={false}
                allowCustom={false}
                placeholder="Select a repo to turn into a project"
                onChange={url => setPickedUrl(url)}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {unused.length} repo{unused.length === 1 ? '' : 's'} not on your profile yet.
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={!pickedUrl}
                  onClick={() => addFromRepo(pickedUrl)}
                >
                  Add project
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
