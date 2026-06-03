import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Query users profile to resolve role-based dashboard destination
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'super_admin') {
          return NextResponse.redirect(`${origin}/admin`)
        } else if (profile?.role === 'client') {
          return NextResponse.redirect(`${origin}/client`)
        }
      }
      return NextResponse.redirect(`${origin}${next || '/'}`)
    }
  }

  // Redirect to portal-login on error
  return NextResponse.redirect(`${origin}/portal-login?error=auth-callback-failed`)
}
