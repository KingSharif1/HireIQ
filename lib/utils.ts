import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'Present') return dateStr
  const [month, year] = dateStr.split('/')
  if (!year) return dateStr
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const m = parseInt(month) - 1
  return `${months[m] || month} ${year}`
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-brand-green'
  if (score >= 50) return 'text-brand-amber'
  return 'text-red-500'
}

export function scoreRingColor(score: number): string {
  if (score >= 70) return '#22C55E'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Strong'
  if (score >= 55) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Work'
}
