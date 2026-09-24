'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, Bell, Settings, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
  collapsed?: boolean
  onToggle?: () => void
}

const NAV_LINK_CLASS =
  'relative flex min-h-11 w-full items-center rounded-xl text-sm font-medium transition-all duration-200'

export function Sidebar({ profile, unreadCount = 0, collapsed = false, onToggle }: SidebarProps) {
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
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden min-h-screen flex-col border-r border-border bg-card py-4 text-muted-foreground transition-[width] duration-200 dark:border-white/5 dark:bg-[#07111b] dark:text-white/65 md:flex',
          collapsed ? 'w-[72px]' : 'w-[232px]',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-4 top-[4.5rem] z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        <Link
          href="/dashboard"
          className={cn(
            'mb-5 flex flex-shrink-0 items-center outline-none transition focus-visible:ring-2 focus-visible:ring-ring',
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-4',
          )}
          aria-label="HireIQ Home"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border shadow-[3px_3px_0_hsl(var(--ink-shadow)/0.12)] transition hover:ring-primary/40 dark:shadow-lg dark:shadow-teal-950/40 dark:ring-white/10 dark:hover:ring-teal-400/40">
            <Image src="/logo.svg" alt="" width={40} height={40} className="h-10 w-10" />
          </span>
          {!collapsed && (
            <span className="font-display text-[15px] font-semibold tracking-tight text-foreground dark:text-white">
              HireIQ
            </span>
          )}
        </Link>

        <nav className="flex w-full flex-1 flex-col gap-1.5 px-3">
          {PRIMARY_NAV.map(({ href, icon: Icon, label, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  NAV_LINK_CLASS,
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  active
                    ? 'bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)] dark:bg-teal-500/20 dark:text-teal-100'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
                aria-label={label}
                title={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="flex w-full flex-col gap-1.5 px-3 pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/notifications"
                className={cn(
                  NAV_LINK_CLASS,
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-secondary hover:text-foreground',
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                )}
                aria-label="Alerts"
                title={collapsed ? 'Alerts' : undefined}
              >
                <Bell className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 truncate">Alerts</span>}
                <UnreadBadge
                  initialCount={unreadCount}
                  className={collapsed ? 'absolute right-1 top-1 scale-75' : 'scale-75'}
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Alerts</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  NAV_LINK_CLASS,
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-secondary',
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  settingsActive && 'bg-primary/10 ring-1 ring-primary/30',
                )}
                aria-label="Open account menu"
                aria-current={settingsActive ? 'page' : undefined}
              >
                <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border dark:ring-white/15">
                  <AvatarFallback className="bg-primary/15 text-[10px] text-primary dark:bg-teal-500/25 dark:text-teal-100">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="truncate text-left">
                    {`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Account'}
                  </span>
                )}
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
