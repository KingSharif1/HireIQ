'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, Settings, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PRIMARY_NAV } from '@/components/shared/primary-nav'
import type { Profile } from '@/types'

interface MobileNavProps {
  profile: Profile | null
  unreadCount?: number
}

export function MobileNav({ profile, unreadCount: _unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  const settingsActive = pathname.startsWith('/dashboard/settings')

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
                'flex min-w-[48px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors',
                active ? 'text-teal-200' : 'text-white/50',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[10px] font-medium">{shortLabel}</span>
            </Link>
          )
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex min-w-[48px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 outline-none transition-colors',
                settingsActive ? 'text-teal-200' : 'text-white/50',
              )}
              aria-label="Open account menu"
              aria-current={settingsActive ? 'page' : undefined}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-teal-500/25 text-[8px] leading-none text-teal-100">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium">Account</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2 w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate">
                {`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Account'}
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {profile?.email ?? ''}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={e => {
                e.preventDefault()
                setTheme(theme === 'dark' ? 'light' : 'dark')
              }}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
