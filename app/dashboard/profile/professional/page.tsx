import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy Professional Profile door → unified Profile. */
export default async function ProfessionalProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const { section } = await searchParams
  const q = new URLSearchParams()
  if (section) q.set('section', section)
  redirect(q.toString() ? `/dashboard/profile?${q.toString()}` : '/dashboard/profile')
}
