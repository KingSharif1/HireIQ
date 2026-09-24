'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV } from '@/components/shared/primary-nav'

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#070f1a]/95 text-white/65 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {PRIMARY_NAV.map(({ href, icon: Icon, shortLabel, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-11 min-w-[48px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors',
                active ? 'text-teal-200' : 'text-white/50',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[10px] font-medium">{shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
