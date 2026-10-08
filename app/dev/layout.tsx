import { notFound } from 'next/navigation'

/** Dev-only routes. Production (including Vercel preview builds) returns 404. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound()
  return children
}
