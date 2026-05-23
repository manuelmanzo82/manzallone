import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PREFIXES = ['/auth', '/_next', '/manifest', '/favicon']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  const { response, user, onboardingCompleted } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Public auth routes + Next internals: pass through, but if logged in &
  // onboarded, push them away from /auth pages back to the app.
  if (pathname.startsWith('/auth')) {
    if (user && onboardingCompleted && pathname !== '/auth/callback') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  if (isPublicPath(pathname)) return response

  // Everything else requires auth.
  if (!user) {
    const url = new URL('/auth/login', request.url)
    return NextResponse.redirect(url)
  }

  // Authenticated but onboarding not done -> force /onboarding (except already there).
  if (!onboardingCompleted && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Authenticated + onboarded but on /onboarding -> back to home.
  if (onboardingCompleted && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
