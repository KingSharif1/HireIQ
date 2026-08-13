'use client'

import { Suspense, useState } from 'react'
import { cn } from '@/lib/utils'
import { SettingsAccount, SettingsIntegrations } from '@/components/settings/SettingsPanels'

type Tab = 'tracking' | 'account'

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('tracking')

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Permissions, connected apps, and account security.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            { id: 'tracking', label: 'Integrations' },
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
        {tab === 'tracking' ? <SettingsIntegrations /> : <SettingsAccount />}
      </Suspense>
    </div>
  )
}
