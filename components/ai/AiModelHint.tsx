'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { modelLabel } from '@/lib/ai/models'

type SettingsPayload = {
  keySource: 'hireiq' | 'byok'
  modelStrong: string
  modelFast: string
}

export function AiModelHint({
  uses = 'strong',
}: {
  uses?: 'strong' | 'fast' | 'strong+fast' | 'infra'
}) {
  const [info, setInfo] = useState<SettingsPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/ai/settings')
      .then(r => (r.ok ? r.json() : null))
      .then((json: SettingsPayload | null) => {
        if (!cancelled && json?.modelStrong) setInfo(json)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!info) return null

  const billed = info.keySource === 'byok' ? 'your Anthropic key' : 'HireIQ’s Claude key'
  let models = modelLabel(info.modelStrong)
  if (uses === 'fast') models = modelLabel(info.modelFast)
  if (uses === 'strong+fast') {
    models = `${modelLabel(info.modelStrong)} + ${modelLabel(info.modelFast)} critique`
  }
  if (uses === 'infra') {
    return (
      <p className="text-xs text-muted-foreground">
        Auto-apply uses HireIQ Cloud Run (not Claude). Usage is in{' '}
        <Link href="/dashboard/settings?tab=ai" className="underline underline-offset-2">
          Settings → AI
        </Link>
        .
      </p>
    )
  }

  return (
    <p className="text-xs text-muted-foreground">
      Uses <span className="text-foreground">{models}</span> via {billed}.{' '}
      <Link href="/dashboard/settings?tab=ai" className="underline underline-offset-2">
        Change
      </Link>
    </p>
  )
}
