'use client'

import { useState } from 'react'

type Status = { kind: 'idle' | 'loading' | 'done' | 'error'; message?: string }

/**
 * Upload a LinkedIn "Connections" export (Settings → Data privacy → Get a copy
 * of your data → Connections.csv). Idempotent — re-importing the same file
 * adds nothing new.
 */
export function ConnectionImport() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onFile(file: File | undefined) {
    if (!file) return
    setStatus({ kind: 'loading' })
    try {
      const text = await file.text()
      const res = await fetch('/api/referrals/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setStatus({ kind: 'error', message: json?.error || 'Import failed' })
        return
      }
      setStatus({
        kind: 'done',
        message: `Imported ${json.imported} of ${json.parsed} connections (rest already on file).`,
      })
    } catch {
      setStatus({ kind: 'error', message: 'Could not read the file.' })
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Import LinkedIn connections</label>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => void onFile(e.target.files?.[0])}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
      />
      {status.kind === 'loading' && <p className="text-xs text-muted-foreground">Importing…</p>}
      {status.kind === 'done' && <p className="text-xs text-brand-green">{status.message}</p>}
      {status.kind === 'error' && <p className="text-xs text-red-600">{status.message}</p>}
    </div>
  )
}
