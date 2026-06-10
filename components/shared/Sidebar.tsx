'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, Briefcase, Sparkles, LogOut, Zap, Home, UserCircle } from 'lucide-react'
import type { Profile } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/resume', icon: FileText, label: 'Resumes' },
  { href: '/dashboard/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/dashboard/tailor', icon: Sparkles, label: 'Tailor' },
]

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email || 'User'
    : 'User'

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-navy-800 border-r border-border px-3 py-4 fixed left-0 top-0">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <span className="font-bold text-lg text-white">HireIQ</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-purple/15 text-brand-purple'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Profile + Logout */}
      <div className="space-y-1 pt-2 border-t border-border mt-2">
        <Link
          href="/dashboard/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/dashboard/profile')
              ? 'bg-brand-purple/15 text-brand-purple'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <div className="w-6 h-6 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-brand-purple">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-[10px] text-muted-foreground">{profile?.email ?? ''}</p>
          </div>
          <UserCircle className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
