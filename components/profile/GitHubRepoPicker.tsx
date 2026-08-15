'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Lock, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { GitHubRepoSnapshot } from '@/lib/github/types'

const CUSTOM = '__custom__'
const NONE = ''

export function selectedRepoValue(github: string, repos: GitHubRepoSnapshot[]): string {
  if (!github.trim()) return NONE
  const match = repos.find(
    r => github.includes(r.fullName) || github.replace(/\/$/, '') === r.htmlUrl.replace(/\/$/, '')
  )
  return match ? match.htmlUrl : CUSTOM
}

export function GitHubRepoPicker({
  repos,
  value,
  onChange,
  placeholder = 'Choose a GitHub repo',
  allowNone = true,
  allowCustom = true,
}: {
  repos: GitHubRepoSnapshot[]
  value: string
  onChange: (url: string, repo?: GitHubRepoSnapshot) => void
  placeholder?: string
  allowNone?: boolean
  allowCustom?: boolean
}) {
  const [query, setQuery] = useState('')
  const sorted = useMemo(
    () => [...repos].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [repos]
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      r => r.fullName.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    )
  }, [sorted, query])

  const selected = sorted.find(r => r.htmlUrl === value || value.includes(r.fullName))
  const label = selected ? selected.name : value ? 'Custom URL' : placeholder

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-between font-normal"
          aria-label="GitHub repository"
        >
          <span className="min-w-0 truncate text-left">
            {selected ? (
              <>
                <span className="text-foreground">{selected.name}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{selected.fullName}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[18rem] p-0"
        align="start"
      >
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your repos…"
              className="h-9 pl-8"
              onKeyDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {allowNone ? (
            <DropdownMenuItem
              onSelect={() => {
                onChange('')
                setQuery('')
              }}
            >
              <span className="text-muted-foreground">Not linked</span>
            </DropdownMenuItem>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No repos match that search.</p>
          ) : (
            filtered.map(repo => {
              const isSelected = selected?.id === repo.id
              return (
                <DropdownMenuItem
                  key={repo.id}
                  className="items-start py-2.5"
                  onSelect={() => {
                    onChange(repo.htmlUrl, repo)
                    setQuery('')
                  }}
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{repo.name}</span>
                      {repo.isPrivate ? (
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {repo.fullName}
                      {repo.languages[0] ? ` · ${repo.languages[0]}` : ''}
                    </span>
                  </span>
                </DropdownMenuItem>
              )
            })
          )}
        </div>
        {allowCustom ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange(CUSTOM)}>
              Paste a URL…
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { CUSTOM }
