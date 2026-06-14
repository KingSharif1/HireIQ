'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // next-themes hydration guard: theme is unknown on the server, so we render a
  // placeholder until mounted to avoid a hydration mismatch. One-time mount flag.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Toggle theme" disabled />
  }

  const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-9 h-9"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  )
}
