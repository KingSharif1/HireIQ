import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Profile is now the Master resume tab on Resume Builder.
 * Keep this route as a redirect so old links and OAuth callbacks still work.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const params = await searchParams
  const q = new URLSearchParams({ view: 'master' })
  if (params.section) q.set('section', params.section)
  redirect(`/dashboard/builder?${q.toString()}`)
}
