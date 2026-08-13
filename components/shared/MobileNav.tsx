'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, Settings, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1d24] border-t border-black/30 z-50 text-white/70">
      <div className="flex items-center justify-around px-2 py-2 safe-bottom">
        {PRIMARY_NAV.map(({ href, icon: Icon, shortLabel, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-md min-w-[48px] transition-colors',
                active ? 'text-white' : 'text-white/55'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{shortLabel}</span>
            </Link>
          )
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-md min-w-[48px] outline-none transition-colors',
                settingsActive ? 'text-white' : 'text-white/55'
              )}
              aria-label="Open account menu"
              aria-current={settingsActive ? 'page' : undefined}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-white/20 text-white leading-none">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium">Account</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
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
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={e => {
                e.preventDefault()
                setTheme(theme === 'dark' ? 'light' : 'dark')
              }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
