import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isAuthCookie(name: string) {
  return name.startsWith('sb-') || name.includes('supabase')
}

function clearAuthCookies(response: NextResponse, cookieNames: string[]) {
  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })
    response.cookies.delete(name)
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const authCookieNames = request.cookies
    .getAll()
    .filter((c) => isAuthCookie(c.name))
    .map((c) => c.name)

  // Logged-out traffic: no Supabase cookies → no getUser / no auth API chatter.
  if (authCookieNames.length === 0) {
    if (path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  const staleRefresh =
    !!userError &&
    (userError.code === 'refresh_token_not_found' ||
      userError.message?.toLowerCase().includes('refresh token'))

  // Dead refresh token: return a clean response (ignore setAll from the failed refresh).
  // Cookie churn on every /login response was causing App Router refetch storms.
  if (staleRefresh) {
    const cleaned =
      path.startsWith('/dashboard')
        ? NextResponse.redirect(new URL('/login', request.url))
        : NextResponse.next({ request })
    clearAuthCookies(cleaned, authCookieNames)
    return cleaned
  }

  const authed = Boolean(user) && !userError

  if (!authed && path.startsWith('/dashboard')) {
    const login = NextResponse.redirect(new URL('/login', request.url))
    clearAuthCookies(login, authCookieNames)
    return login
  }

  if (authed && (path === '/login' || path === '/signup' || path === '/forgot-password')) {
    const next = request.nextUrl.searchParams.get('next')
    const safeNext =
      next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : null
    return NextResponse.redirect(new URL(safeNext || '/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
