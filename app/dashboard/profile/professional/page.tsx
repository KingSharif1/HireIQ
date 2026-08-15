import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy Professional Profile door → Profile. */
export default async function ProfessionalProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const { section } = await searchParams
  const q = section ? `?section=${encodeURIComponent(section)}` : ''
  redirect(`/dashboard/profile${q}`)
}
