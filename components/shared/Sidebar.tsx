'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, Zap, Bell, User, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { UnreadBadge } from '@/components/notifications/UnreadBadge'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { PRIMARY_NAV } from '@/components/shared/primary-nav'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
  unreadCount?: number
}

export function Sidebar({ profile, unreadCount = 0 }: SidebarProps) {
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

  const profileActive = pathname.startsWith('/dashboard/profile')

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="hidden md:flex flex-col items-center w-[60px] min-h-screen bg-[#1a1d24] text-white/70 py-3 fixed left-0 top-0 z-40 border-r border-black/20">
        <Link
          href="/dashboard"
          className="mb-4 w-9 h-9 rounded-md bg-white flex items-center justify-center flex-shrink-0"
          aria-label="HireIQ Home"
        >
          <Zap className="w-4 h-4 text-[#1a1d24]" fill="currentColor" />
        </Link>

        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-1.5">
          {PRIMARY_NAV.map(({ href, icon: Icon, label, match }) => {
            const active = match(pathname)
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center justify-center w-11 h-11 rounded-md transition-colors',
                      active
                        ? 'bg-white/15 text-white'
                        : 'text-white/55 hover:bg-white/10 hover:text-white'
                    )}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        <div className="flex flex-col items-center gap-1 w-full px-1.5 pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/notifications"
                className="relative flex items-center justify-center w-11 h-11 rounded-md text-white/55 hover:bg-white/10 hover:text-white"
                aria-label="Alerts"
              >
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5">
                  <UnreadBadge initialCount={unreadCount} className="scale-75" />
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Alerts</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center justify-center w-11 h-11 rounded-md hover:bg-white/10 outline-none',
                  profileActive && 'bg-white/15'
                )}
                aria-label="Open account menu"
                aria-current={profileActive ? 'page' : undefined}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px] bg-white/20 text-white">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
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
                <Link href="/dashboard/profile">
                  <User className="w-4 h-4" />
                  Profile
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
      </aside>
    </TooltipProvider>
  )
}
