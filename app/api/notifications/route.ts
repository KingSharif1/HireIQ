import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNotifications, getUnreadNotificationCount } from '@/lib/supabase/queries'
import { sortNotificationsUnreadFirst } from '@/lib/notifications'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const countOnly = searchParams.get('countOnly') === 'true'

  const { count, error: countErr } = await getUnreadNotificationCount(supabase, user.id)
  if (countErr) {
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }

  if (countOnly) {
    return NextResponse.json({ unreadCount: count ?? 0 })
  }

  const { data, error } = await getNotifications(supabase, user.id)
  if (error) {
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }

  return NextResponse.json({
    notifications: sortNotificationsUnreadFirst(data ?? []),
    unreadCount: count ?? 0,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    ids?: string[]
    refId?: string
    markAll?: boolean
  }

  let query = supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (body.markAll) {
    // mark all unread
  } else if (body.refId) {
    query = query.eq('ref_id', body.refId)
  } else if (body.ids?.length) {
    query = query.in('id', body.ids)
  } else {
    return NextResponse.json({ error: 'ids, refId, or markAll required' }, { status: 400 })
  }

  const { data, error } = await query.select('id')
  if (error) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }

  const { count } = await getUnreadNotificationCount(supabase, user.id)

  return NextResponse.json({
    marked: data?.length ?? 0,
    unreadCount: count ?? 0,
  })
}
