import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy Documents door → Profile documents section. */
export default async function ProfileDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const { section } = await searchParams
  redirect(`/dashboard/profile?section=${encodeURIComponent(section || 'resumes')}`)
}
