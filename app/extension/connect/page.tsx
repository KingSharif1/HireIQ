import { Suspense } from 'react'
import { ExtensionConnectClient } from './ExtensionConnectClient'

export default function ExtensionConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <ExtensionConnectClient />
    </Suspense>
  )
}
