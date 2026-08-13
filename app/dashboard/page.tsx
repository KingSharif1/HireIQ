import { createClient } from '@/lib/supabase/server'
import { HomeTiles } from '@/components/home/HomeTiles'

export default async function DashboardHome() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let firstName: string | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .maybeSingle()
    firstName = data?.first_name ?? null
  }

  return <HomeTiles firstName={firstName} />
}
