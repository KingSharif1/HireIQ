import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy Professional Profile door → Resume Builder master. */
export default async function ProfessionalProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const { section } = await searchParams
  const q = new URLSearchParams({ view: 'master' })
  if (section) q.set('section', section)
  redirect(`/dashboard/builder?${q.toString()}`)
}
