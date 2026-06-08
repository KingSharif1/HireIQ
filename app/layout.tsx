import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HireIQ — Get the Interview',
  description: 'Tailor your resume to any job description and pass ATS systems with AI-powered precision.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
