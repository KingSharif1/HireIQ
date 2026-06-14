'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Sparkles, LogOut, Zap, Home, Bell, PanelLeftClose, PanelLeftOpen, User, Sun, Moon,
} from 'lucide-react'
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
import type { Profile } from '@/types'

const NAV_ITEMS: {
  href: string
  icon: typeof Home
  label: string
  badge?: boolean
}[] = [
  { href: '/dashboard', icon: Home, label: 'Applications' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Alerts', badge: true },
  { href: '/dashboard/tailor', icon: Sparkles, label: 'Tailor' },
]

interface SidebarProps {
  profile: Profile | null
  unreadCount?: number
  collapsed?: boolean
  onToggle?: () => void
}

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
  const displayName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email || 'User'
    : 'User'

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col min-h-screen bg-card border-r border-border py-4 fixed left-0 top-0 z-40',
          'transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[4.5rem] px-2 items-center' : 'w-60 px-3'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn('flex items-center mb-6', collapsed ? 'justify-center' : 'justify-between px-1')}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            {!collapsed && <span className="font-bold text-lg text-white">HireIQ</span>}
          </Link>
          {!collapsed && onToggle && (
            <button
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && onToggle && (
          <button
            onClick={onToggle}
            className="mb-3 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* Nav */}
        <nav className={cn('flex-1 w-full space-y-1', collapsed && 'flex flex-col items-center')}>
          {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
            const link = (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-all duration-150',
                  collapsed ? 'justify-center w-11 h-11' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-brand-purple/15 text-brand-purple'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <span className="relative flex-shrink-0">
                  <Icon className="w-4 h-4" />
                  {badge && (
                    <span className="absolute -top-1.5 -right-2">
                      <UnreadBadge initialCount={unreadCount} />
                    </span>
                  )}
                </span>
                {!collapsed && label}
              </Link>
            )
            return collapsed ? (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            )
          })}
        </nav>

        {/* Profile menu (theme + sign out live in here now) */}
        <div className={cn('w-full pt-2 border-t border-border mt-2', collapsed && 'flex justify-center')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center rounded-lg transition-colors hover:bg-secondary outline-none',
                  collapsed ? 'justify-center w-11 h-11' : 'gap-3 px-2 py-2 w-full text-left'
                )}
                aria-label="Open profile menu"
              >
                <Avatar className={collapsed ? 'h-8 w-8' : 'h-8 w-8'}>
                  <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{profile?.email ?? ''}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="truncate">{displayName}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {profile?.email ?? ''}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="w-4 h-4" />
                  Profile &amp; documents
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
