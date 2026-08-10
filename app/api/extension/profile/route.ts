import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { normalizeProfileData } from '@/lib/profile/provenance'
import {
  emptyAutofillProfile,
  type AutofillProfile,
} from '@/lib/extension/form-fill'
import type { Profile, ProfileData } from '@/types'

export const runtime = 'nodejs'

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

function pickUrl(urls: { label: string; url: string }[], pattern: RegExp): string {
  const hit = urls.find(u => pattern.test(u.label) || pattern.test(u.url))
  return hit?.url?.trim() || ''
}

function buildAutofillProfile(
  row: Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'>,
): AutofillProfile {
  const data = normalizeProfileData((row.profile_data ?? {}) as ProfileData)
  const personal = data.personal
  const base = emptyAutofillProfile()
  return {
    ...base,
    firstName: (personal.firstName || row.first_name || '').trim(),
    lastName: (personal.lastName || row.last_name || '').trim(),
    preferredName: (personal.firstName || row.first_name || '').trim(),
    email: (personal.email || row.email || '').trim(),
    phone: (personal.phone || '').trim(),
    linkedin: pickUrl(data.urls, /linkedin/i),
    website: pickUrl(data.urls, /portfolio|website|personal|github\.com|^site$/i) ||
      data.urls.find(u => !/linkedin/i.test(u.label) && !/linkedin/i.test(u.url))?.url?.trim() ||
      '',
    country: '',
    howHeard: 'LinkedIn',
  }
}

/**
 * Token-authed profile snapshot for Chrome extension autofill.
 * Returns only contact fields needed to fill ATS forms — no full resume body.
 */
export async function GET(request: Request) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  let userId: string | null
  try {
    userId = await resolveExtensionUserId(bearer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status, headers })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401, headers })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('first_name, last_name, email, profile_data')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers })
  }
  if (!data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers })
  }

  const profile = buildAutofillProfile(
    data as Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'>,
  )
  const normalized = normalizeProfileData(
    ((data as Pick<Profile, 'profile_data'>).profile_data ?? {}) as ProfileData,
  )

  const autofillPreview = {
    fullName: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Add your name',
    headline: (normalized.personal.headline || '').trim(),
    email: profile.email || 'Add email in Profile',
    phone: profile.phone || 'Add phone in Profile',
    location: (normalized.personal.location || '').trim(),
    linkedin: profile.linkedin,
    website: profile.website,
    experience: normalized.experience.slice(0, 4).map(e => ({
      title: e.title || '',
      company: e.company || '',
    })),
    education: normalized.education.slice(0, 2).map(e => ({
      school: e.institution || '',
      degree: e.degree || '',
    })),
    skills: [
      ...(normalized.skills?.technical || []),
      ...(normalized.skills?.tools || []),
    ]
      .filter(Boolean)
      .slice(0, 8),
  }

  return NextResponse.json(
    {
      profile,
      autofillPreview,
      appUrl: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
      profileUrl: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/dashboard/profile/professional`,
    },
    { status: 200, headers },
  )
}
