export const dynamic = 'force-dynamic'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FASTAPI = process.env.FASTAPI_INTERNAL_URL!
const SECRET  = process.env.FASTAPI_SECRET_KEY!

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${FASTAPI}/risk/alerts`, {
    headers: {
      'X-Internal-Secret': SECRET,
      'X-User-Id': session.user.id,
    },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
