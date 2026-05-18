import { NextResponse } from 'next/server'

/**
 * DEV-ONLY: sets the middleware bypass cookie and redirects to /dashboard
 * so the rebuild can be screenshotted without a real Supabase session.
 *
 * Will be removed in Phase 6 when the real auth pages are rebuilt.
 * Returns 404 in production.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = new URL(req.url)
  const target = url.searchParams.get('to') ?? '/dashboard'

  const res = NextResponse.redirect(new URL(target, req.url))
  res.cookies.set('__pw_bypass', 'finsight_test_2024', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours, plenty for the rebuild session
  })
  return res
}
