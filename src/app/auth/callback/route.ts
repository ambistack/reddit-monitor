import { createServerClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return redirect(`https://${forwardedHost}${next}`)
      } else {
        return redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return redirect('/auth/auth-code-error')
}
