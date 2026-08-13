import type { Metadata } from 'next'
import { DM_Sans, Inter, Syne } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
