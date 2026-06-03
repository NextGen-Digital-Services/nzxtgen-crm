import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Clean up legacy login route
  if (url.pathname === '/login') {
    url.pathname = '/portal-login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, query the database for their role
  let role: string | null = null
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        role = profile.role
      }
    } catch (err) {
      console.error('[Middleware] Error fetching user role:', err)
    }
  }

  const isAdminPath = url.pathname === '/admin' || url.pathname.startsWith('/admin/')
  const isClientPath = url.pathname === '/client' || url.pathname.startsWith('/client/')

  // 1. Unauthenticated Router Guards
  if (!user) {
    if (isAdminPath) {
      url.pathname = '/admin-login'
      return NextResponse.redirect(url)
    }
    if (isClientPath) {
      url.pathname = '/portal-login'
      return NextResponse.redirect(url)
    }
  }

  // 2. Authenticated Router Guards & Redirects
  if (user) {
    // If no role found or mismatch, force sign-out to prevent loops
    if (!role) {
      await supabase.auth.signOut()
      url.pathname = '/portal-login'
      return NextResponse.redirect(url)
    }

    // Role: super_admin routing
    if (role === 'super_admin') {
      if (url.pathname === '/admin-login' || url.pathname === '/portal-login') {
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
      if (isClientPath) {
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    }

    // Role: client routing
    if (role === 'client') {
      if (url.pathname === '/admin-login' || url.pathname === '/portal-login') {
        url.pathname = '/client'
        return NextResponse.redirect(url)
      }
      if (isAdminPath) {
        url.pathname = '/portal-login'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
