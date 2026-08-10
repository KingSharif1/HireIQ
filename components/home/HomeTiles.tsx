'use client'

import Link from 'next/link'
import { FileText, Briefcase, Puzzle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExtensionConnectPanel } from '@/components/home/ExtensionConnectPanel'

/** Dashboard hub tiles — IA reset labels. */
const TILES: {
  href: string
  title: string
  icon: typeof FileText
}[] = [
  { href: '/dashboard/tracker', title: 'Applications', icon: Briefcase },
  { href: '/dashboard/builder', title: 'Resume Builder', icon: FileText },
  { href: '#chrome-extension', title: 'Chrome Extension', icon: Puzzle },
]

export function HomeTiles() {
  return (
    <div className="mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full">
        {TILES.map(tile => {
          const Icon = tile.icon
          return (
            <Link key={tile.title} href={tile.href} className="block no-underline">
              <div
                className={cn(
                  'box-border flex flex-col gap-2.5 items-center justify-center pb-3 pt-4 px-3 rounded-md w-full border transition-colors min-h-[120px]',
                  'border-border bg-white dark:bg-card cursor-pointer hover:border-foreground/40'
                )}
              >
                <Icon className="w-7 h-7 text-foreground/80" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground text-center leading-tight">
                  {tile.title}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <ExtensionConnectPanel />
    </div>
  )
}
