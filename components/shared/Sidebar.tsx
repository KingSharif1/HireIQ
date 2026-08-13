'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, Bell, Settings, Sun, Moon } from 'lucide-react'
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
import { UnreadBadge } from '@/components/notifications/UnreadBadge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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

  const settingsActive = pathname.startsWith('/dashboard/settings')

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed left-0 top-0 z-40 hidden min-h-screen w-[68px] flex-col items-center border-r border-white/5 bg-[#070f1a] py-4 text-white/65 md:flex">
        <Link
          href="/dashboard"
          className="mb-5 flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-teal-950/40 ring-1 ring-white/10 transition hover:ring-teal-400/40"
          aria-label="HireIQ Home"
        >
          <Image src="/logo.svg" alt="" width={40} height={40} className="h-10 w-10" />
        </Link>

        <nav className="flex w-full flex-1 flex-col items-center gap-1.5 px-2">
          {PRIMARY_NAV.map(({ href, icon: Icon, label, match }) => {
            const active = match(pathname)
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      'relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                      active
                        ? 'bg-teal-500/20 text-teal-200 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.35)]'
                        : 'text-white/50 hover:bg-white/8 hover:text-white',
                    )}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-teal-300" />
                    )}
                    <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        <div className="flex w-full flex-col items-center gap-1.5 px-2 pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/8 hover:text-white"
                aria-label="Alerts"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-1.5 top-1.5">
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
                  'flex h-11 w-11 items-center justify-center rounded-xl outline-none transition hover:bg-white/8',
                  settingsActive && 'bg-teal-500/15 ring-1 ring-teal-400/30',
                )}
                aria-label="Open account menu"
                aria-current={settingsActive ? 'page' : undefined}
              >
                <Avatar className="h-8 w-8 ring-1 ring-white/15">
                  <AvatarFallback className="bg-teal-500/25 text-[10px] text-teal-100">
                    {initials}
                  </AvatarFallback>
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
      </aside>
    </TooltipProvider>
  )
}
