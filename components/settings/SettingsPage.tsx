'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SettingsAccount, SettingsIntegrations } from '@/components/settings/SettingsPanels'
import { AiSettingsPanel } from '@/components/settings/AiSettingsPanel'

type Tab = 'tracking' | 'ai' | 'account'

export function SettingsPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('tracking')

  useEffect(() => {
    const q = searchParams.get('tab')
    if (q === 'ai' || q === 'account' || q === 'tracking') setTab(q)
  }, [searchParams])

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI keys and models, connected apps, and account security.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            { id: 'tracking', label: 'Integrations' },
            { id: 'ai', label: 'AI' },
            { id: 'account', label: 'Account' },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Suspense fallback={null}>
        {tab === 'tracking' ? <SettingsIntegrations /> : null}
        {tab === 'ai' ? <AiSettingsPanel /> : null}
        {tab === 'account' ? <SettingsAccount /> : null}
      </Suspense>
    </div>
  )
}
