import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

// Self-hosted (latin subset, variable weight) so builds never depend on fetching
// Google Fonts — that fetch flaked Vercel builds. Files: app/fonts (SIL OFL 1.1).
const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  variable: '--font-inter',
  weight: '300 700',
  display: 'swap',
})

const syne = localFont({
  src: './fonts/syne-latin-var.woff2',
  variable: '--font-syne',
  weight: '500 800',
  display: 'swap',
})

const dmSans = localFont({
  src: './fonts/dm-sans-latin-var.woff2',
  variable: '--font-dm-sans',
  weight: '400 700',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HireIQ — Get the Interview',
  description: 'Tailor your resume to any job description and pass ATS systems with AI-powered precision.',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${syne.variable} ${dmSans.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
